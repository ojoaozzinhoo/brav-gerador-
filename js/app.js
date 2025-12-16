import { GoogleGenAI } from "@google/genai";

// --- STATE MANAGEMENT ---
const state = {
    user: null,
    subjectImages: [],
    mode: 'BACKGROUND', // BACKGROUND | THUMBNAIL
    uiMode: 'DESIGNER', // QUICK | DESIGNER
    settings: {
        niche: '',
        description: '',
        position: 'Direita',
        preset: null
    },
    currentImage: null, // Base64 full string
    isProcessing: false
};

// --- DOM ELEMENTS ---
const els = {
    subjectUpload: document.getElementById('subjectUploadContainer'),
    inputNiche: document.getElementById('inputNiche'),
    inputDesc: document.getElementById('inputDescription'),
    btnGenerate: document.getElementById('generateBtn'),
    previewContainer: document.getElementById('previewContainer'),
    loading: document.getElementById('loadingIndicator'),
    resultImage: document.getElementById('resultImage'),
    emptyState: document.getElementById('emptyState'),
    actionBar: document.getElementById('actionBar'),
    downloadLink: document.getElementById('downloadLink'),
    errorDisplay: document.getElementById('errorDisplay'),
    refineContainer: document.getElementById('refineContainer'),
    refineInput: document.getElementById('refineInput'),
    refineBtn: document.getElementById('refineBtn'),
    logoutBtn: document.getElementById('logoutBtn')
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Setup API Key via Window (AI Studio Context)
    try {
        if (window.aistudio && window.aistudio.openSelectKey) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
            }
        }
    } catch(e) { console.warn("AI Studio bridge not found, using ENV key if available."); }

    // 2. Render UI
    renderSubjectUpload();
    renderPositionSelector();
    loadPresets();
    
    // 3. Event Listeners
    els.btnGenerate.addEventListener('click', () => handleGenerate(false));
    els.refineBtn.addEventListener('click', () => handleGenerate(true));
    els.logoutBtn.addEventListener('click', handleLogout);
    
    // Mode Switchers
    document.getElementById('btnModeBg').addEventListener('click', () => setMode('BACKGROUND'));
    document.getElementById('btnModeThumb').addEventListener('click', () => setMode('THUMBNAIL'));
    
    document.querySelectorAll('.ui-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.uiMode = e.target.dataset.mode;
            updateUIStyles();
        });
    });
});

// --- RENDER FUNCTIONS ---
function renderSubjectUpload() {
    const container = els.subjectUpload;
    container.innerHTML = '';
    
    // Grid of images
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 gap-3 mb-2';
    
    state.subjectImages.forEach((img, idx) => {
        const div = document.createElement('div');
        div.className = 'relative group aspect-square rounded-lg overflow-hidden border border-gray-700 bg-dark-800';
        div.innerHTML = `
            <img src="${img.data}" class="w-full h-full object-cover">
            <button onclick="window.removeImage(${idx})" class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
        `;
        grid.appendChild(div);
    });
    container.appendChild(grid);

    // Upload Button
    if (state.subjectImages.length < 3) {
        const uploadBox = document.createElement('div');
        uploadBox.className = 'border-2 border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-500/10 transition-colors relative';
        uploadBox.innerHTML = `
            <input type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="window.handleImageUpload(this)">
            <div class="text-sm text-gray-400"><span class="text-brand-500 font-bold">Adicionar Foto</span></div>
        `;
        container.appendChild(uploadBox);
    }
}

// Helpers globais para eventos inline do HTML
window.handleImageUpload = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.subjectImages.push({
                mimeType: input.files[0].type,
                data: e.target.result // Base64 completo
            });
            renderSubjectUpload();
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.removeImage = (idx) => {
    state.subjectImages.splice(idx, 1);
    renderSubjectUpload();
};

function renderPositionSelector() {
    const container = document.getElementById('positionSelector');
    container.innerHTML = '';
    ['Esquerda', 'Centro', 'Direita'].forEach(pos => {
        const btn = document.createElement('button');
        const isActive = state.settings.position === pos;
        btn.className = `py-3 rounded-lg border text-xs font-bold transition-all ${isActive ? 'border-brand-500 bg-brand-500/20 text-brand-500' : 'border-gray-700 bg-dark-900 text-gray-400'}`;
        btn.innerText = pos;
        btn.onclick = () => {
            state.settings.position = pos;
            renderPositionSelector();
        };
        container.appendChild(btn);
    });
}

// --- LOGIC ---

async function loadPresets() {
    try {
        const res = await fetch('api/presets.php');
        const custom = await res.json();
        
        const grid = document.getElementById('presetsGrid');
        grid.innerHTML = '';
        
        // Presets Padrão
        const defaults = [
            { name: 'SMM Dark Neon', icon: '🚀', prompt: 'Estilo Neon Cyberpunk, fundo escuro, luzes magenta.' },
            { name: 'Corporativo Clean', icon: '🏢', prompt: 'Estilo clean, vidro, escritório moderno, luz branca.' },
            { name: 'Luxo Gold', icon: '💰', prompt: 'Estilo Luxo, mármore preto e dourado, iluminação dramática.' }
        ];

        [...defaults, ...custom].forEach(p => {
            const btn = document.createElement('button');
            const isActive = state.settings.preset?.name === p.name;
            btn.className = `p-3 rounded-xl border border-gray-700 bg-dark-900 text-left hover:border-brand-500 transition-all ${isActive ? 'border-brand-500 bg-brand-500/10' : ''}`;
            btn.innerHTML = `<div class="text-lg mb-1">${p.icon || '🎨'}</div><div class="text-xs font-bold text-gray-200">${p.name}</div>`;
            btn.onclick = () => {
                state.settings.preset = p;
                loadPresets(); 
            };
            grid.appendChild(btn);
        });
    } catch(e) { console.error(e); }
}

function setMode(newMode) {
    state.mode = newMode;
    const btnBg = document.getElementById('btnModeBg');
    const btnThumb = document.getElementById('btnModeThumb');
    
    if (newMode === 'BACKGROUND') {
        btnBg.className = 'px-4 py-2 rounded-md text-xs font-bold transition-all bg-brand-600 text-white shadow';
        btnThumb.className = 'px-4 py-2 rounded-md text-xs font-bold transition-all text-gray-400 hover:text-white';
    } else {
        btnBg.className = 'px-4 py-2 rounded-md text-xs font-bold transition-all text-gray-400 hover:text-white';
        btnThumb.className = 'px-4 py-2 rounded-md text-xs font-bold transition-all bg-red-600 text-white shadow';
    }
}

function updateUIStyles() {
    const designerControls = document.getElementById('designerControls');
    if (state.uiMode === 'QUICK') {
        designerControls.classList.add('hidden');
    } else {
        designerControls.classList.remove('hidden');
    }
    
    document.querySelectorAll('.ui-mode-btn').forEach(btn => {
        if (btn.dataset.mode === state.uiMode) {
            btn.className = 'ui-mode-btn px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow';
        } else {
            btn.className = 'ui-mode-btn px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition-all text-gray-400';
        }
    });
}

// --- PROMPT BUILDER ---

function buildPrompt(isRefinement) {
    const { niche, description, position, preset } = state.settings;
    const presetPrompt = preset ? preset.prompt : "";
    
    if (state.mode === 'BACKGROUND') {
        if (isRefinement) {
            return `
                ATUE COMO EDITOR SÊNIOR.
                TAREFA: Editar a imagem fornecida seguindo esta instrução: "${els.refineInput.value}".
                
                REGRAS RÍGIDAS:
                1. MANTENHA A IDENTIDADE do sujeito EXATAMENTE como na imagem original.
                2. Mantenha a composição profissional.
                3. Estilo: Nano Banana Pro, 8k.
            `;
        }

        return `
            ATUE COMO UM ARTISTA DIGITAL SÊNIOR (Especialista em Web Design).
            
            Crie um background profissional para site (Hero Section).
            
            CONTEXTO:
            - Nicho/Profissão: ${niche}
            - Estilo/Vibe: ${presetPrompt || "Moderno, Profissional, Clean, Corporativo"}
            - Detalhes Extras: ${description}
            
            ESTRUTURA DA IMAGEM (OBRIGATÓRIO):
            1. POSIÇÃO DO SUJEITO: ${position}. Use a regra dos terços.
            2. ESPAÇO NEGATIVO: O lado oposto deve estar LIMPO para inserção de texto/títulos.
            3. ILUMINAÇÃO: Use 'Rim Light' (luz de recorte) para separar o sujeito do fundo.
            4. HEADROOM: NÃO corte a cabeça do sujeito. Deixe margem acima.
            
            PROTOCOLO DE IDENTIDADE:
            - Clone o rosto e características das imagens de referência fornecidas.
            - O sujeito deve parecer realista e profissional.
            
            QUALIDADE: 8k, Texturas Reais, Profundidade de Campo Suave.
        `;
    } else {
        // Thumbnail Mode
        return `
            Crie uma Thumbnail de YouTube VIRAL para o nicho: ${niche}.
            
            ESTILO: Clickbait Alto Contraste (Estilo MrBeast ou similar).
            - Cores saturadas.
            - Iluminação dramática.
            - Sujeito com expressão marcante.
            - Fundo deve contar uma história sobre o nicho.
            
            Se houver instrução de refinamento: "${els.refineInput.value || ''}".
        `;
    }
}

// --- GEMINI API CALL ---

async function handleGenerate(isRefinement) {
    if (!state.subjectImages.length && !isRefinement) {
        showError("Adicione pelo menos uma imagem do sujeito.");
        return;
    }
    if (!els.inputNiche.value && !isRefinement) {
        showError("Defina um nicho.");
        return;
    }

    setLoading(true);
    els.errorDisplay.classList.add('hidden');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = ai.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

        const promptText = buildPrompt(isRefinement);
        const parts = [{ text: promptText }];
        
        // Add Images
        if (isRefinement && state.currentImage) {
            // Remove header data:image/png;base64, se existir
            const base64Clean = state.currentImage.split(',')[1];
            parts.push({ inlineData: { mimeType: 'image/png', data: base64Clean } });
            parts.push({ text: "IMAGEM BASE PARA EDIÇÃO (MANTENHA IDENTIDADE):" });
        } else {
            state.subjectImages.forEach(img => {
                const base64Clean = img.data.split(',')[1];
                parts.push({ inlineData: { mimeType: img.mimeType, data: base64Clean } });
            });
            parts.push({ text: "REFERÊNCIAS DE IDENTIDADE DO SUJEITO (CLONAR ROSTO):" });
        }

        const response = await model.generateContent({
            contents: [{ parts }],
            generationConfig: {
                responseMimeType: "image/png",
                // Aspect Ratio Logic
                imageConfig: {
                    aspectRatio: state.mode === 'THUMBNAIL' ? "16:9" : "16:9",
                    imageSize: "1K"
                }
            }
        });
        
        // Tratamento da resposta (API Gemini Imagen retorna base64 dentro de inlineData)
        const candidate = response.response.candidates?.[0];
        const imgPart = candidate?.content?.parts?.find(p => p.inlineData);
        
        if (imgPart) {
            const finalUrl = `data:image/png;base64,${imgPart.inlineData.data}`;
            state.currentImage = finalUrl;
            
            // Update UI
            els.resultImage.src = finalUrl;
            els.resultImage.classList.remove('hidden');
            els.emptyState.classList.add('hidden');
            els.actionBar.classList.remove('hidden');
            els.refineContainer.classList.remove('hidden');
            
            // Update Download Link
            els.downloadLink.href = finalUrl;
            
            if (isRefinement) els.refineInput.value = '';

            // Log Usage via PHP
            fetch('api/usage.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: isRefinement ? 'refine' : 'generate',
                    resolution: '1K',
                    timestamp: new Date().toISOString()
                })
            });

        } else {
            throw new Error("A IA não retornou uma imagem válida.");
        }

    } catch (err) {
        console.error(err);
        showError("Erro na geração: " + (err.message || err));
    } finally {
        setLoading(false);
    }
}

// --- UTILS ---

function setLoading(isLoading) {
    state.isProcessing = isLoading;
    if (isLoading) {
        els.loading.classList.remove('hidden');
        els.btnGenerate.innerHTML = 'RENDERIZANDO...';
        els.btnGenerate.disabled = true;
        els.resultImage.classList.add('opacity-50');
    } else {
        els.loading.classList.add('hidden');
        els.btnGenerate.innerHTML = state.mode === 'THUMBNAIL' ? 'GERAR THUMBNAIL' : 'GERAR BACKGROUND';
        els.btnGenerate.disabled = false;
        els.resultImage.classList.remove('opacity-50');
    }
}

function showError(msg) {
    els.errorDisplay.innerText = msg;
    els.errorDisplay.classList.remove('hidden');
    setTimeout(() => els.errorDisplay.classList.add('hidden'), 5000);
}

async function handleLogout() {
    await fetch('api/logout.php');
    window.location.href = 'login.php';
}