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

  // 2. Verifica Permissão de Chave do Sistema (Requer DB)
  try {
      const currentUser = await dbService.getCurrentUser();
      
      // Admin ou usuário com permissão explícita pode usar a chave do sistema
      if (currentUser?.allowed_system_key || currentUser?.role === 'admin') {
          const dbKey = await dbService.getGlobalApiKey();
          if (dbKey) return dbKey;
          
          // Fallback seguro para env var (evita crash se process não existir)
          if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
             return process.env.API_KEY;
          }
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

const IDENTITY_BLOCK = `
  !!! PROTOCOLO DE IDENTIDADE FACIAL (PRIORIDADE 0) !!!
  1. O rosto gerado DEVE SER IDÊNTICO ao da "REFERÊNCIA DE IDENTIDADE" fornecida.
  2. NÃO CRIE UM ROSTO GENÉRICO. Clone os traços: nariz, olhos, boca, estrutura óssea e imperfeições.
  3. Mantenha a mesma etnia, idade e características distintivas (barba, óculos, sinais) da referência.
  4. Se a referência for uma pessoa real, o resultado deve parecer a MESMA PESSOA em uma nova foto.
`;

const buildBackgroundPrompt = (settings: GenerationSettings, type: 'desktop' | 'mobile', hasContextImage: boolean, refineInstruction?: string, uiMode: UIMode = 'DESIGNER'): string => {
    const { 
        niche, subjectDescription, position, environmentDescription,
        environmentMaterial, depthLevel, lightingStyle,
        rimLight, framing, styleMode, gradientColor, gradientDirection, useCustomSize, customWidth, customHeight, presetStyleDescription, masterStyleReference
      } = settings;
    
      const isMobile = type === 'mobile';
      const isQuickMode = uiMode === 'QUICK';
    
      if (refineInstruction && hasContextImage) {
        return `ATUE COMO EDITOR SÊNIOR. TAREFA: Editar a imagem fornecida com base nesta instrução: "${refineInstruction}". REGRAS: 1. ${IDENTITY_BLOCK} 2. MANTENHA A IDENTIDADE.`;
      }
    
      let directionPrompt = "vindo de BAIXO"; 
      switch(gradientDirection) {
         case GradientDirection.BOTTOM_UP: directionPrompt = "vindo de BAIXO (Bottom-Up)"; break;
         case GradientDirection.TOP_DOWN: directionPrompt = "vindo de CIMA (Top-Down)"; break;
         case GradientDirection.LEFT_RIGHT: directionPrompt = "vindo da ESQUERDA"; break;
         case GradientDirection.RIGHT_LEFT: directionPrompt = "vindo da DIREITA"; break;
      }
      
      let compositionPrompt = "";
      let gradientInstruction = "";

      if (isMobile) {
        const mobileSizeInstruction = useCustomSize ? `RESOLUÇÃO EXATA DE SAÍDA: ${customWidth}x${customHeight} pixels.` : "FORMATO: Vertical 9:16.";
        const color = gradientColor || '#000000';
        compositionPrompt = `VERSÃO MOBILE: 1. ${mobileSizeInstruction} 2. Sujeito CENTRALIZADO. 3. HEADROOM OBRIGATÓRIO.`;
        gradientInstruction = `SAFE ZONE: APLICAR DEGRADÊ (${color}) EXTREMAMENTE FORTE ${directionPrompt} cobrindo 40% da área inferior.`;
      } else {
        const sizeInstruction = useCustomSize ? `RESOLUÇÃO ALVO: ${customWidth}x${customHeight}.` : "FORMATO: Hero Desktop (16:9).";
        compositionPrompt = `LAYOUT DESKTOP: 1. ${sizeInstruction} 2. POSIÇÃO: ${position.toUpperCase()}. 3. HEADROOM OBRIGATÓRIO.`;
        if (isQuickMode || styleMode === StyleMode.FADE) {
           gradientInstruction = `SAFE ZONE: Adicione DEGRADÊ PROFISSIONAL cor ${gradientColor} ${directionPrompt}.`;
        }
      }
    
      let stylePrompt = masterStyleReference ? `!!! BLUEPRINT VISUAL ATIVO !!! Use EXATAMENTE a estética da imagem mestre para o nicho ${niche}.` : "";
      let framingPrompt = "";
      switch(framing) {
        case Framing.CLOSEUP: framingPrompt = "Foco intenso no rosto."; break;
        case Framing.MID: framingPrompt = "Plano Médio profissional."; break;
        case Framing.AMERICAN: framingPrompt = "Plano Americano."; break;
      }
      
      let customLightsDetails = isQuickMode ? "ILUMINAÇÃO AUTOMÁTICA OTIMIZADA." : `Lighting Style: ${lightingStyle}. RimLight: ${rimLight.enabled?rimLight.value:'off'}.`;
      
      return `
        Artista Digital Sênior. NICHO: ${niche}. ${IDENTITY_BLOCK} ${stylePrompt}
        ${compositionPrompt} ${gradientInstruction}
        DETALHES: ${framingPrompt} ${subjectDescription}.
        AMBIENTE: ${environmentMaterial} ${depthLevel} ${environmentDescription}.
        ${customLightsDetails}
        ${presetStyleDescription || ""}
        QUALIDADE: 8k, Nano Banana Pro.
      `;
};

const buildThumbnailPrompt = (settings: ThumbnailSettings): string => {
   const { mainText, secondaryText, avatarSide, vibe, projectContext, environmentMaterial, lightingStyle } = settings;
   return `DESIGNER THUMBNAIL. ${IDENTITY_BLOCK} Contexto: ${projectContext}. Vibe: ${vibe}. Layout: Avatar ${avatarSide}. Texto: ${mainText} - ${secondaryText}. Estilo: ${lightingStyle}. Material: ${environmentMaterial}.`;
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
          throw new Error("ADMIN: Chave de API Global não configurada. Vá em 'Configurações (Engrenagem)' -> 'Painel Administrativo' -> 'Configuração Global' e salve sua API Key do Google Gemini.");
      } else {
          throw new Error("Acesso negado: Nenhuma Chave de API disponível. Peça ao administrador para configurar a chave do sistema ou insira sua chave pessoal.");
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
  // Comprimir todas as imagens antes de anexar para evitar Payload Too Large e Timeouts
  
  if (masterStyleRef) {
      const optimized = await compressReferenceImage(masterStyleRef);
      parts.push({ text: "IMAGEM REFERÊNCIA MESTRE DE ESTILO (BLUEPRINT VISUAL):" });
      parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
  }

  if (contextImageUrl) {
    const parsed = parseDataUrl(contextImageUrl);
    if (parsed) {
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } });
      parts.push({ text: "REFERÊNCIA PRIMÁRIA: Use a imagem acima como base absoluta." });
    }
  }

  if (subjectImages.length > 0) {
    parts.push({ text: "REFERÊNCIA DE IDENTIDADE (AVATAR/SUJEITO) - CLONAR ESTE ROSTO:" });
    for (const img of subjectImages) {
        const optimized = await compressReferenceImage(img);
        parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
    }
  }

  if (!hasContext && environmentImages && environmentImages.length > 0) {
     const label = appMode === AppMode.THUMBNAIL ? "REFERÊNCIA DE FUNDO:" : "REFERÊNCIA DE AMBIENTE:";
     parts.push({ text: label });
     for (const img of environmentImages) {
        const optimized = await compressReferenceImage(img);
        parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
     }
  }

  if (!hasContext && styleImages.length > 0) {
    parts.push({ text: "REFERÊNCIAS DE ESTILO SECUNDÁRIAS (VIBE):" });
    for (let i = 0; i < styleImages.length; i++) {
        const img = styleImages[i];
        const optimized = await compressReferenceImage(img);
        parts.push({ inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } });
        const instruction = img.description && img.description.trim() !== ''
            ? `ESTILO ${i + 1}: ${img.description}.`
            : `ESTILO ${i + 1}: Copie a paleta, luz e atmosfera.`;
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