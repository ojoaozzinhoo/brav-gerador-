import { GoogleGenAI } from "@google/genai";
import { GenerationSettings, ThumbnailSettings, ReferenceImage, AppMode, Resolution, UIMode, GradientDirection, StyleMode, Framing } from "../types";
import { trackUsage } from "./usageService";
import { dbService } from "./dbService";
import { supabase } from "./supabaseClient";

const MODEL_NAME = 'gemini-3-pro-image-preview';

// --- API KEY HANDLING ---

export const setManualApiKey = (key: string) => {
  if (key) {
    localStorage.setItem('user_provided_api_key', key);
  } else {
    localStorage.removeItem('user_provided_api_key');
  }
};

// Busca a chave correta com base nas permissões do usuário
const getApiKey = async (): Promise<string | null> => {
  // 1. Chave Manual do Usuário (Local Storage) tem PRIORIDADE TOTAL e é instantânea.
  const manualKey = localStorage.getItem('user_provided_api_key');
  if (manualKey) return manualKey;

  // 2. Environment Variables (Priority over DB)
  // Try various patterns for Env Vars
  const envKey = 
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_KEY) ||
    (import.meta as any).env?.VITE_API_KEY ||
    (import.meta as any).env?.API_KEY;

  if (envKey) return envKey;

  // 3. Verifica Permissão de Chave do Sistema (Requer DB)
  try {
      const currentUser = await dbService.getCurrentUser();
      
      // Admin ou usuário com permissão explícita pode usar a chave do sistema
      if (currentUser?.allowed_system_key || currentUser?.role === 'admin') {
          const dbKey = await dbService.getGlobalApiKey();
          if (dbKey) return dbKey;
      }
  } catch (error) {
      console.warn("Erro ao verificar chave de sistema:", error);
  }
  return null;
};

export const checkApiKey = async (): Promise<boolean> => {
  const key = await getApiKey();
  return !!key;
};

export const promptForApiKey = async (): Promise<void> => {
  const key = await getApiKey();
  if (key) return;

  if (window.aistudio && window.aistudio.openSelectKey) {
    try {
        await window.aistudio.openSelectKey();
    } catch (e) {
        console.warn("Falha ao abrir seletor AI Studio", e);
    }
  }
};

// --- IMAGE OPTIMIZATION HELPERS ---

// Otimiza imagens de entrada com timeout de segurança
const compressReferenceImage = async (img: ReferenceImage): Promise<ReferenceImage> => {
    return new Promise((resolve) => {
        // Timeout de 5s para evitar que uma imagem corrompida trave o app
        const timeoutId = setTimeout(() => {
             console.warn("Timeout na compressão de imagem. Usando original.");
             resolve(img);
        }, 5000);

        const image = new Image();
        image.onload = () => {
            clearTimeout(timeoutId);
            const MAX_SIZE = 1536; // Tamanho seguro para referências
            let w = image.width;
            let h = image.height;
            
            if (w <= MAX_SIZE && h <= MAX_SIZE) {
                resolve(img); // Retorna original se já for pequena
                return;
            }

            // Mantém aspect ratio
            if (w > h) {
                if (w > MAX_SIZE) {
                    h *= MAX_SIZE / w;
                    w = MAX_SIZE;
                }
            } else {
                if (h > MAX_SIZE) {
                    w *= MAX_SIZE / h;
                    h = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if(!ctx) { resolve(img); return; }
            
            ctx.drawImage(image, 0, 0, w, h);
            // Comprime para JPEG 85%
            const newDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({
                base64: newDataUrl.split(',')[1],
                mimeType: 'image/jpeg',
                description: img.description
            });
        };
        image.onerror = () => {
            clearTimeout(timeoutId);
            console.warn("Falha ao carregar imagem para compressão, usando original.");
            resolve(img); 
        };
        image.src = `data:${img.mimeType};base64,${img.base64}`;
    });
};

const getClosestAspectRatio = (width: number, height: number): string => {
  const targetRatio = width / height;
  const supportedRatios = { "16:9": 16/9, "9:16": 9/16, "1:1": 1, "4:3": 4/3, "3:4": 3/4 };
  let closestRatio = "16:9";
  let minDiff = Number.MAX_VALUE;
  for (const [key, value] of Object.entries(supportedRatios)) {
    const diff = Math.abs(targetRatio - value);
    if (diff < minDiff) { minDiff = diff; closestRatio = key; }
  }
  return closestRatio;
};

const resizeImage = (dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (targetWidth - scaledWidth) / 2;
      let y = scaledHeight > targetHeight ? (targetHeight - scaledHeight) / 2 : 0; // Center Y
      if (scaledHeight > targetHeight) y = 0; // Top align priority usually better for portraits, but center is safer
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const REALISM_BLOCK = `
  ### STRICT REALISM PROTOCOL (NO CARTOONS ALLOWED) ###
  1. STYLE: RAW PHOTOGRAPHY (Sony A7R IV).
  2. TEXTURE: Skin MUST have visible pores, moles, and micro-texture. NO "smooth plastic" or "airbrushed" look.
  3. LIGHTING: Physically based rendering (PBR). Shadows must match the light sources.
  4. FORBIDDEN: Illustration, Drawing, Painting, Anime, 3D Character Art, Plastic Skin.
  5. IDENTITY: The face must be a DIGITAL CLONE of the reference.
`;

const buildBackgroundPrompt = (settings: GenerationSettings, type: 'desktop' | 'mobile', hasContextImage: boolean, refineInstruction?: string, uiMode: UIMode = 'DESIGNER'): string => {
    const { 
        niche, subjectDescription, position, environmentDescription,
        environmentMaterial, depthLevel, lightingStyle, colorGrading,
        rimLight, framing, styleMode, gradientColor, gradientDirection, useCustomSize, customWidth, customHeight, presetStyleDescription, masterStyleReference,
        floatingElements, floatingElementsDescription,
        backgroundColor, keyLight, complementaryLight, volumetricLight
      } = settings;
    
      if (refineInstruction && hasContextImage) {
        return `ROLE: Senior Retoucher. TASK: Edit the photo strictly following: "${refineInstruction}". RULES: 1. ${REALISM_BLOCK} 2. KEEP IDENTITY PRESERVED.`;
      }
      
      const isMobile = type === 'mobile';
      
      // 1. CAMERA RIG (STRICT)
      let cameraSetup = "";
      if (isMobile) {
          cameraSetup = `
          - FORMAT: 9:16 Vertical.
          - COMPOSITION: Subject CENTERED.
          - HEADROOM: Leave clear space above head for UI.
          `;
      } else {
          // Desktop Logic - FORCE override of reference composition
          let posInstruction = "";
          if (position === 'Esquerda') posInstruction = "Subject MUST be on the LEFT THIRD. Right side EMPTY.";
          else if (position === 'Direita') posInstruction = "Subject MUST be on the RIGHT THIRD. Left side EMPTY.";
          else posInstruction = "Subject CENTERED.";
          
          cameraSetup = `
          - FORMAT: 16:9 Horizontal.
          - POSITIONING: ${position.toUpperCase()}. ${posInstruction}
          - FRAMING: ${framing}.
          - WARNING: Ignore the reference image's position. Use the position specified HERE.
          `;
      }

      // 2. PHYSICAL LIGHTING SETUP (DISTINCT SOURCES)
      let activeLights = [];
      
      if (rimLight.enabled) activeLights.push(`SOURCE A (Back/Edge): High Intensity RIM LIGHT. Color: ${rimLight.value} (Hex). Purpose: Separation.`);
      if (keyLight.enabled) activeLights.push(`SOURCE B (Front/Face): Soft KEY LIGHT. Color: ${keyLight.value} (Hex). Purpose: Face illumination.`);
      if (complementaryLight.enabled) activeLights.push(`SOURCE C (Fill): Low Intensity FILL. Color: ${complementaryLight.value} (Hex).`);
      if (volumetricLight.enabled) activeLights.push(`SOURCE D (Atmosphere): Volumetric Fog/Haze. Color: ${volumetricLight.value} (Hex).`);
      if (backgroundColor.enabled) activeLights.push(`SOURCE E (Environment): Background Ambient Tint. Color: ${backgroundColor.value} (Hex) at ${Math.round(backgroundColor.opacity * 100)}% opacity.`);

      let lightingBlock = "";
      if (activeLights.length > 0) {
          lightingBlock = `
          ### MULTI-LIGHT SETUP (RENDER ALL DISTINCTLY)
          You are a virtual gaffer. Place these SPECIFIC lights in the scene. 
          DO NOT blend them into one color. If Rim is Red and Key is Blue, I want to see RED EDGES and BLUE FACE simultaneously.
          ${activeLights.join('\n')}
          `;
      } else {
          lightingBlock = "LIGHTING: Professional Studio Lighting (Rembrandt or Split).";
      }

      // 3. UI OVERLAY (MANDATORY GRADIENT)
      let postProcessingBlock = "";
      if (uiMode === 'QUICK' || styleMode === StyleMode.FADE) {
          let dirText = "";
          switch(gradientDirection) {
              case GradientDirection.BOTTOM_UP: dirText = "Bottom (Opaque) to Top (Transparent)"; break;
              case GradientDirection.TOP_DOWN: dirText = "Top (Opaque) to Bottom (Transparent)"; break;
              case GradientDirection.LEFT_RIGHT: dirText = "Left (Opaque) to Right (Transparent)"; break;
              case GradientDirection.RIGHT_LEFT: dirText = "Right (Opaque) to Left (Transparent)"; break;
          }

          postProcessingBlock = `
          ### UI LAYER (COMPOSITING)
          - ACTION: Bake a linear gradient overlay for text readability.
          - COLOR: ${gradientColor} (Hex).
          - DIRECTION: ${dirText}.
          - INTENSITY: Start at 100% opacity, fade to 0%.
          `;
      }

      // 4. ENVIRONMENT & PROPS
      let floatingBlock = "";
      if (floatingElements) {
          const props = floatingElementsDescription || "Abstract tech shapes, glass shards";
          floatingBlock = `
          - SCENOGRAPHY: Add floating 3D elements (${props}) around the subject.
          - DEPTH: Use Depth of Field (Bokeh) to blur background elements.
          `;
      }

      // FINAL PROMPT ASSEMBLY
      return `
        ROLE: High-End CGI Artist & Photographer.
        TASK: Create a Photorealistic Website Hero Background.

        ${REALISM_BLOCK}

        ### 1. CAMERA & SUBJECT
        ${cameraSetup}
        - SUBJECT DETAILS: ${subjectDescription}

        ### 2. LIGHTING & ATMOSPHERE (STRICT ADHERENCE)
        - BASE STYLE: ${lightingStyle}.
        ${lightingBlock}

        ### 3. ENVIRONMENT
        - NICHE: ${niche}.
        - DETAILS: ${environmentDescription}.
        - MATERIAL: ${environmentMaterial} (Realistic PBR Texture).
        - COLOR GRADING: ${colorGrading}.
        ${floatingBlock}
        
        ### 4. STYLE REFERENCE
        ${masterStyleReference ? '- STYLE CLONE: Copy the exact mood, texture quality, and color palette of the "Reference Style Blueprint" image.' : ''}

        ${postProcessingBlock}

        ### NEGATIVE PROMPT (AVOID):
        - NO CARTOONS, NO DRAWINGS, NO ILLUSTRATIONS.
        - NO PLASTIC SKIN.
        - DO NOT IGNORE SELECTED LIGHT COLORS.
        - DO NOT CHANGE SUBJECT POSITION.

        OUTPUT: 8K Raw Photo.
      `;
};

const buildThumbnailPrompt = (settings: ThumbnailSettings): string => {
   const { mainText, secondaryText, avatarSide, vibe, projectContext, environmentMaterial, lightingStyle, rimLight, keyLight, volumetricLight, depthLevel } = settings;
   
   let prompt = `ROLE: Viral YouTube Thumbnail Artist.\n`;
   prompt += `${REALISM_BLOCK}\n`;
   prompt += `CONTEXT: ${projectContext}.\n`;
   prompt += `VIBE: ${vibe}.\n\n`;
   
   prompt += `### LAYOUT (STRICT)\n`;
   prompt += `- AVATAR: Place on the ${avatarSide === 'left' ? 'LEFT' : 'RIGHT'} side.\n`;
   prompt += `- EXPRESSION: Hyper-real, intense emotion.\n`;
   prompt += `- SPACE: Leave opposite side EMPTY for text.\n\n`;
   
   prompt += `### LIGHTING (MULTI-SOURCE)\n`;
   prompt += `- STYLE: ${lightingStyle}.\n`;
   if (rimLight.enabled) prompt += `- RIM LIGHT: ${rimLight.value} (Hex) Hard Edge Light.\n`;
   if (keyLight.enabled) prompt += `- KEY LIGHT: ${keyLight.value} (Hex) on Face.\n`;
   
   prompt += `### BACKGROUND\n`;
   prompt += `- Material: ${environmentMaterial}.\n`;
   prompt += `- Quality: Photorealistic 8K.\n`;

   return prompt;
};

const parseDataUrl = (url: string) => {
  const matches = url.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  return { mimeType: matches[1], base64: matches[2] };
};

// --- MAIN GENERATION FUNCTION ---
export const generateBackground = async (
  subjectImages: ReferenceImage[],
  styleImages: ReferenceImage[],
  environmentImages: ReferenceImage[],
  settings: GenerationSettings | ThumbnailSettings,
  type: 'desktop' | 'mobile' | 'thumbnail', 
  contextImageUrl?: string,
  refineInstruction?: string,
  appMode: AppMode = AppMode.BACKGROUND,
  uiMode: UIMode = 'DESIGNER'
): Promise<string> => {

  // 1. CHECK USER LIMITS
  const currentUser = await dbService.getCurrentUser();
  if (!currentUser) throw new Error("Usuário não autenticado.");

  if (currentUser.image_limit !== undefined && (currentUser.images_generated || 0) >= currentUser.image_limit) {
    throw new Error(`Limite de gerações atingido (${currentUser.images_generated}/${currentUser.image_limit}). Peça mais créditos ao admin.`);
  }

  // 2. OBTAIN API KEY with Better Error Handling
  let apiKeyToUse = await getApiKey();
  
  if (!apiKeyToUse) {
      if (currentUser.role === 'admin') {
          throw new Error("ADMIN: Chave de API não detectada (Env Var ou Banco). Por favor, configure a chave no Painel Admin ou verifique as variáveis de ambiente.");
      } else {
          throw new Error("Acesso negado: Nenhuma Chave de API disponível. Peça ao administrador para configurar a chave do sistema.");
      }
  }

  const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
  const hasContext = !!contextImageUrl;
  
  let prompt = "";
  let aspectRatio = "16:9";
  let currentResolution = Resolution.FHD;
  let presetName: string | undefined = undefined;
  let presetType: 'predefined' | 'custom' | undefined = undefined;
  let masterStyleRef: ReferenceImage | null = null;
  let finalImageSize = "1K";

  if (appMode === AppMode.BACKGROUND) {
    const bgSettings = settings as GenerationSettings;
    currentResolution = bgSettings.resolution;
    finalImageSize = currentResolution;
    presetName = bgSettings.activePresetName;
    presetType = bgSettings.activePresetType;
    masterStyleRef = bgSettings.masterStyleReference || null;
    
    if (type === 'mobile') {
        if (bgSettings.useCustomSize) {
           aspectRatio = getClosestAspectRatio(bgSettings.customWidth, bgSettings.customHeight);
           const maxDim = Math.max(bgSettings.customWidth, bgSettings.customHeight);
           if (maxDim > 2048) finalImageSize = '4K';
           else if (maxDim > 1280 && finalImageSize === '1K') finalImageSize = '2K';
        } else {
           aspectRatio = "9:16";
        }
    } else if (bgSettings.useCustomSize) {
        aspectRatio = getClosestAspectRatio(bgSettings.customWidth, bgSettings.customHeight);
        const maxDim = Math.max(bgSettings.customWidth, bgSettings.customHeight);
        if (maxDim > 2048) finalImageSize = '4K';
        else if (maxDim > 1280 && finalImageSize === '1K') finalImageSize = '2K';
    } else {
        aspectRatio = "16:9";
        finalImageSize = currentResolution;
    }
    prompt = buildBackgroundPrompt(bgSettings, type as 'desktop' | 'mobile', hasContext, refineInstruction, uiMode);
  } else {
    aspectRatio = "16:9";
    if (refineInstruction && hasContext) {
       prompt = `ATUE COMO EDITOR DE THUMBNAILS. Edite a imagem fornecida: ${refineInstruction}.`;
    } else {
       prompt = buildThumbnailPrompt(settings as ThumbnailSettings);
    }
  }

  const parts: any[] = [{ text: prompt }];

  // --- IMAGE PREPARATION & COMPRESSION ---
  
  if (masterStyleRef) {
      const optimized = await compressReferenceImage(masterStyleRef);
      parts.push({ text: "REFERENCE STYLE BLUEPRINT (COPY MOOD & COLORS):" });
      parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
  }

  if (contextImageUrl) {
    const parsed = parseDataUrl(contextImageUrl);
    if (parsed) {
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } });
      parts.push({ text: "PRIMARY CONTEXT IMAGE (BASE):" });
    }
  }

  if (subjectImages.length > 0) {
    parts.push({ text: "IDENTITY REFERENCE (CLONE FACE EXACTLY - KEEP PORES/TEXTURE):" });
    for (const img of subjectImages) {
        const optimized = await compressReferenceImage(img);
        parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
    }
  }

  if (!hasContext && environmentImages && environmentImages.length > 0) {
     const label = appMode === AppMode.THUMBNAIL ? "BACKGROUND REF:" : "ENVIRONMENT REF (USE FOR TEXTURE/MATERIAL):";
     parts.push({ text: label });
     for (const img of environmentImages) {
        const optimized = await compressReferenceImage(img);
        parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
     }
  }

  if (!hasContext && styleImages.length > 0) {
    parts.push({ text: "SECONDARY VIBE REFERENCES:" });
    for (let i = 0; i < styleImages.length; i++) {
        const img = styleImages[i];
        const optimized = await compressReferenceImage(img);
        parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
        const instruction = img.description && img.description.trim() !== ''
            ? `STYLE REF ${i + 1}: ${img.description}.`
            : `STYLE REF ${i + 1}: Copy lighting/atmosphere.`;
        parts.push({ text: instruction });
    }
  }
  
  try {
    // 3. API Call with TIMEOUT PROTECTION (95s limit)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("O servidor demorou muito para responder (Timeout). A imagem pode ser muito complexa.")), 95000)
    );

    const apiCallPromise = ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: finalImageSize, 
        },
      },
    });

    const response: any = await Promise.race([apiCallPromise, timeoutPromise]);

    // 4. INCREMENT USAGE (FIRE AND FORGET)
    dbService.incrementUsage(currentUser.id).then(() => {
        const usage = response.usageMetadata;
        trackUsage(
            refineInstruction && hasContext ? 'refine' : 'generate',
            finalImageSize as Resolution, 
            usage?.promptTokenCount || 0,
            usage?.candidatesTokenCount || 0,
            presetName,
            presetType,
            uiMode
        );
    }).catch(e => console.warn("Falha silenciosa ao registrar uso (UI não afetada):", e));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        let finalImage = `data:image/png;base64,${part.inlineData.data}`;
        
        // Resize final image only if needed (for custom sizes)
        if (appMode === AppMode.BACKGROUND) {
            const gs = settings as GenerationSettings;
            if (gs.useCustomSize && gs.customWidth > 0 && gs.customHeight > 0) {
                try {
                    finalImage = await resizeImage(finalImage, gs.customWidth, gs.customHeight);
                } catch (resizeErr) {
                    console.warn("Resize final falhou, retornando original:", resizeErr);
                }
            }
        }
        
        return finalImage;
      }
    }
    
    throw new Error("A IA não retornou nenhuma imagem válida (Resposta vazia).");

  } catch (error) {
    console.error(`Erro ao gerar ${type}:`, error);
    throw error;
  }
};