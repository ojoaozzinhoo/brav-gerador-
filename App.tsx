import React, { useState, useEffect, useRef } from 'react';
import { OptionSelector } from './components/OptionSelector';
import { ImageUpload } from './components/ImageUpload';
import { HistoryBar } from './components/HistoryBar';
import { UsageModal } from './components/UsageModal';
import { PresetSelector } from './components/PresetSelector';
import { CollapsibleSection } from './components/CollapsibleSection';
import { checkApiKey, promptForApiKey, generateBackground, setManualApiKey } from './services/geminiService';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { PasswordResetModal } from './components/PasswordResetModal'; 
import { 
  GeneratedImage, GenerationSettings, ThumbnailSettings, ReferenceImage, 
  AppMode, SubjectPosition, Framing, StyleMode, Resolution, GradientDirection, 
  LightingStyle, ColorGrading, ThumbnailVibe, TextEffect, EnvironmentMaterial, DepthLevel, Preset, UIMode
} from './types';

// Icons for the UI
const IconUser = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const IconSettings = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconPalette = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
const IconLayers = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const IconAspectRatio = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>;
const IconPresets = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${checked ? 'bg-brand-500' : 'bg-gray-700'}`}
  >
    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-200 ${checked ? 'left-6' : 'left-1'}`} />
  </button>
);

const ColorPicker = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) => (
  <div className="flex items-center gap-2 bg-dark-900 border border-gray-700 rounded-lg p-2 flex-1 min-w-[120px]">
    <input 
      type="color" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0 shrink-0"
    />
    <span className="text-xs text-gray-400 truncate">{label}</span>
  </div>
);

// --- DASHBOARD COMPONENT ---
const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  
  // --- STATE ---
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.BACKGROUND);
  const [uiMode, setUiMode] = useState<UIMode>('DESIGNER'); 
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const [manualKeyInput, setManualKeyInput] = useState('');
  
  const [autoGenerateMobile, setAutoGenerateMobile] = useState(false);
  const [mobileTargetSize, setMobileTargetSize] = useState({ width: 1080, height: 1920 });
  const [isSharing, setIsSharing] = useState(false);

  const [subjectImages, setSubjectImages] = useState<ReferenceImage[]>([]);
  const [environmentImages, setEnvironmentImages] = useState<ReferenceImage[]>([]);
  const [styleImages, setStyleImages] = useState<ReferenceImage[]>([]);
  
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  
  // Settings (Background)
  const [bgSettings, setBgSettings] = useState<GenerationSettings>({
    subjectDescription: '',
    position: SubjectPosition.RIGHT,
    niche: '',
    environmentDescription: '',
    useEnvironmentReference: false,
    environmentMaterial: EnvironmentMaterial.ABSTRACT,
    depthLevel: DepthLevel.MEDIUM,
    floatingElements: true,
    floatingElementsDescription: '',
    lightingStyle: LightingStyle.STUDIO,
    colorGrading: ColorGrading.NEUTRAL,
    backgroundColor: { enabled: false, value: '#000000', opacity: 0.5 },
    rimLight: { enabled: true, value: '#4ade80' },
    complementaryLight: { enabled: true, value: '#3b82f6' },
    volumetricLight: { enabled: false, value: '#ffffff' },
    keyLight: { enabled: false, value: '#ffffff' },
    framing: Framing.MID,
    styleMode: StyleMode.BLUR,
    gradientColor: '#000000',
    gradientDirection: GradientDirection.BOTTOM_UP,
    resolution: Resolution.FHD,
    useCustomSize: false,
    customWidth: 1920,
    customHeight: 1080,
    masterStyleReference: null
  });

  // Settings (Thumbnail)
  const [thumbSettings, setThumbSettings] = useState<ThumbnailSettings>({
    mainText: 'TÍTULO IMPACTANTE',
    secondaryText: '',
    textColor: '#FFFFFF',
    textEffect: TextEffect.OUTLINE,
    avatarSide: 'right',
    vibe: ThumbnailVibe.CLICKBAIT,
    projectContext: '',
    accentColor: '#FF0000',
    environmentMaterial: EnvironmentMaterial.ABSTRACT,
    depthLevel: DepthLevel.MEDIUM,
    lightingStyle: LightingStyle.CINEMATIC,
    volumetricLight: { enabled: false, value: '#ffffff' },
    keyLight: { enabled: true, value: '#ffffff' },
    rimLight: { enabled: true, value: '#FF0000' },
    complementaryLight: { enabled: false, value: '#3b82f6' },
  });

  // Results
  const [desktopResult, setDesktopResult] = useState<GeneratedImage | null>(null);
  const [mobileResult, setMobileResult] = useState<GeneratedImage | null>(null);
  const [thumbnailResult, setThumbnailResult] = useState<GeneratedImage | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refineText, setRefineText] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Ref to safety timer
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeResult = appMode === AppMode.BACKGROUND 
      ? (viewMode === 'desktop' ? desktopResult : mobileResult) 
      : thumbnailResult;
  
  // --- INIT ---
  useEffect(() => {
    const init = async () => {
      const ready = await checkApiKey();
      setApiKeyReady(ready);
    };
    init();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
        if(safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  const clearSafetyTimer = () => {
      if(safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
      }
  };

  const startSafetyTimer = () => {
      clearSafetyTimer();
      // Force unlock after 100 seconds if backend hangs completely
      safetyTimerRef.current = setTimeout(() => {
          if (isProcessing) {
              console.warn("Safety timer triggered: unlocking UI.");
              setIsProcessing(false);
              setErrorMsg("O navegador interrompeu a espera (Timeout de Segurança). Tente usar imagens menores ou reduzir a resolução.");
              // Force clear loading states
              setDesktopResult(prev => prev ? { ...prev, loading: false } : null);
              setMobileResult(prev => prev ? { ...prev, loading: false } : null);
              setThumbnailResult(prev => prev ? { ...prev, loading: false } : null);
          }
      }, 100000); 
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
        // Tenta conectar (seja via sistema ou diálogo AI Studio)
        await promptForApiKey();
        
        // Verifica se a conexão foi bem sucedida
        const ready = await checkApiKey();
        
        if (ready) {
            setApiKeyReady(true);
        } else {
             // Tratamento de erro detalhado
             if (user?.role === 'admin' && !user?.allowed_system_key) {
                 alert("Atenção Admin: Sua conta não tem permissão para usar a Chave do Sistema (flag 'allowed_system_key' desligada no DB).");
            } else {
                 alert("Não foi possível conectar automaticamente. Se você não é admin, precisa selecionar uma chave no pop-up do Google ou inserir manualmente.");
            }
        }
    } catch (e) {
        console.error(e);
        alert("Erro inesperado ao tentar conectar.");
    } finally {
        setIsConnecting(false);
    }
  };

  const handleManualKeySubmit = async () => {
    if (!manualKeyInput.trim()) return;
    setIsConnecting(true);
    try {
        setManualApiKey(manualKeyInput);
        const ready = await checkApiKey();
        if (ready) {
            setApiKeyReady(true);
        } else {
            alert("Erro: A chave parece ter sido salva mas não foi detectada. Verifique se ela é válida.");
        }
    } catch (e) {
        alert("Erro ao salvar chave manual.");
    } finally {
        setIsConnecting(false);
    }
  };

  // ... Rest of the handlers (handlePresetSelect, handleGenerate, etc.) ...
  const handlePresetSelect = (preset: Preset) => {
    const newSettings = { 
        ...bgSettings, 
        ...preset.settings,
        activePresetId: preset.id,
        activePresetName: preset.name,
        activePresetType: preset.type,
        presetStyleDescription: preset.promptExtra,
    };
    if (preset.settings.backgroundColor) {
        newSettings.backgroundColor = { ...bgSettings.backgroundColor, ...preset.settings.backgroundColor };
    }
    if ((preset.settings as any).niche) {
        newSettings.niche = (preset.settings as any).niche;
    }
    setBgSettings(newSettings);
  };

  const handleUpdateBgSettings = (partial: Partial<GenerationSettings>) => {
    setBgSettings(prev => ({ ...prev, ...partial }));
  };

  const handleManualMobileGeneration = async () => {
    if (!desktopResult?.url) return;
    setErrorMsg(null);
    setIsProcessing(true);
    startSafetyTimer();
    
    const timestamp = Date.now();
    setMobileResult({ id: `m_${timestamp}`, type: 'mobile', url: '', loading: true, timestamp });
    setViewMode('mobile');

    try {
        const mobileUrl = await generateBackground(
            subjectImages, styleImages, environmentImages, 
            { ...bgSettings, useCustomSize: true, customWidth: mobileTargetSize.width, customHeight: mobileTargetSize.height }, 
            'mobile', desktopResult.url, undefined, appMode, uiMode
        );
        const newMobile: GeneratedImage = { id: `m_${timestamp}`, type: 'mobile', url: mobileUrl, loading: false, timestamp };
        setMobileResult(newMobile);
        setHistory(prev => { const updated = [...prev, newMobile]; return updated.slice(-4); });
        await refreshUser(); 
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Erro ao gerar versão mobile.");
        setMobileResult(null);
        setViewMode('desktop');
    } finally {
        clearSafetyTimer();
        setIsProcessing(false);
    }
  };

  const handleGenerate = async (isRefinement: boolean = false) => {
    setErrorMsg(null);
    if (!isRefinement) {
      if (subjectImages.length === 0) { setErrorMsg("Adicione pelo menos uma imagem do Sujeito/Avatar."); return; }
      if (appMode === AppMode.BACKGROUND && !bgSettings.niche.trim()) { setErrorMsg("O campo Nicho / Profissão é obrigatório."); return; }
      if (appMode === AppMode.THUMBNAIL && !thumbSettings.projectContext.trim()) { setErrorMsg("O contexto do vídeo é obrigatório."); return; }
    } else {
       if (!activeResult?.url) return;
       if (!refineText.trim()) { setErrorMsg("Digite uma instrução para o ajuste fino."); return; }
    }
    
    setIsProcessing(true);
    startSafetyTimer();
    const timestamp = Date.now();

    try {
      if (appMode === AppMode.BACKGROUND) {
          if (!isRefinement) {
             setDesktopResult({ id: '', type: 'desktop', url: '', loading: true, timestamp: 0 });
             if (autoGenerateMobile) setMobileResult({ id: '', type: 'mobile', url: '', loading: true, timestamp: 0 });
             else setMobileResult(null);
             setViewMode('desktop');

             const desktopUrl = await generateBackground(subjectImages, styleImages, environmentImages, bgSettings, 'desktop', undefined, undefined, appMode, uiMode);
             
             const newDesktop: GeneratedImage = { id: `d_${timestamp}`, type: 'desktop', url: desktopUrl, loading: false, timestamp };
             setDesktopResult(newDesktop);
             setHistory(prev => { const updated = [...prev, newDesktop]; return updated.slice(-4); });

             if (autoGenerateMobile) {
                const mobileUrl = await generateBackground(subjectImages, styleImages, environmentImages, bgSettings, 'mobile', desktopUrl, undefined, appMode, uiMode);
                const newMobile: GeneratedImage = { id: `m_${timestamp}`, type: 'mobile', url: mobileUrl, loading: false, timestamp };
                setMobileResult(newMobile);
                setHistory(prev => { const updated = [...prev, newMobile]; return updated.slice(-4); });
             }

          } else {
             if (viewMode === 'desktop') setDesktopResult(prev => ({ ...prev!, loading: true }));
             else setMobileResult(prev => ({ ...prev!, loading: true }));

             const contextUrl = activeResult!.url;
             const type = viewMode;
             const refinedUrl = await generateBackground(subjectImages, styleImages, environmentImages, bgSettings, type, contextUrl, refineText, appMode, uiMode);
             const newRefined: GeneratedImage = { id: `ref_${timestamp}`, type, url: refinedUrl, loading: false, timestamp };

             if (type === 'desktop') setDesktopResult(newRefined);
             else setMobileResult(newRefined);
             setHistory(prev => { const updated = [...prev, newRefined]; return updated.slice(-4); });
             setRefineText('');
          }
      } else {
         if (!isRefinement) setThumbnailResult({ id: '', type: 'desktop', url: '', loading: true, timestamp: 0 });
         else setThumbnailResult(prev => ({ ...prev!, loading: true }));

         const contextUrl = isRefinement ? activeResult?.url : undefined;
         const thumbUrl = await generateBackground(subjectImages, styleImages, environmentImages, thumbSettings, 'thumbnail', contextUrl, isRefinement ? refineText : undefined, appMode, uiMode);
         
         const newThumb: GeneratedImage = { id: `t_${timestamp}`, type: 'desktop', url: thumbUrl, loading: false, timestamp };
         setThumbnailResult(newThumb);
         setHistory(prev => { const updated = [...prev, newThumb]; return updated.slice(-4); });
         if(isRefinement) setRefineText('');
      }
      
      await refreshUser();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro na geração. Verifique conexão, cota ou permissão de API.");
      if (appMode === AppMode.BACKGROUND) {
        setDesktopResult(prev => prev ? { ...prev, loading: false } : null);
        setMobileResult(prev => prev ? { ...prev, loading: false } : null);
      } else {
        setThumbnailResult(prev => prev ? { ...prev, loading: false } : null);
      }
    } finally {
      clearSafetyTimer();
      setIsProcessing(false);
    }
  };

  const handleSelectHistory = (img: GeneratedImage) => {
    if (appMode === AppMode.BACKGROUND) {
      if (img.type === 'desktop') { setDesktopResult(img); setViewMode('desktop'); } 
      else { setMobileResult(img); setViewMode('mobile'); }
    } else { setThumbnailResult(img); }
  };

  const handleDownload = () => {
    if (activeResult?.url) {
      const link = document.createElement('a');
      link.href = activeResult.url;
      link.download = `brav-gen-${activeResult.type}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleCopyToClipboard = async () => {
    if (!activeResult?.url) return;
    try {
      const response = await fetch(activeResult.url);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      alert("Imagem copiada para a área de transferência!");
    } catch (err) { console.error(err); alert("Erro ao copiar imagem. Use o botão de Download."); }
  };

  const handleShareLink = () => {
    setIsSharing(true);
    setTimeout(() => {
        setIsSharing(false);
        const mockLink = `https://brav-gen.app/share/v/${Math.random().toString(36).substr(2, 9)}`;
        navigator.clipboard.writeText(mockLink);
        alert(`Link de aprovação copiado!\n${mockLink}\n\n(Simulação)`);
    }, 1500);
  };

  if (!apiKeyReady && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
         {/* Background Effect */}
         <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"></div>
         </div>

         <div className="w-full max-w-md bg-[#1e1e2e]/90 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl p-8 z-10 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-400 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg mx-auto mb-4">AI</div>
                <h1 className="text-2xl font-bold">Configuração Necessária</h1>
                <p className="text-sm text-gray-400">
                    Olá, <span className="text-white font-semibold">{user?.name}</span>. Para começar, precisamos conectar uma chave de API.
                </p>
            </div>

            <div className="space-y-6">
                {/* Opção 1: Automático / Sistema */}
                <button 
                    onClick={handleConnect} 
                    disabled={isConnecting}
                    className={`w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group ${isConnecting ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isConnecting ? (
                        <>
                           <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           Verificando...
                        </>
                    ) : (
                        <>
                           <svg className="w-5 h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                           Conectar Automaticamente
                        </>
                    )}
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-700"></div>
                    <span className="flex-shrink-0 mx-4 text-xs text-gray-500 uppercase font-bold">Ou insira manualmente</span>
                    <div className="flex-grow border-t border-gray-700"></div>
                </div>

                {/* Opção 2: Manual */}
                <div className="space-y-2">
                    <input 
                        type="password" 
                        value={manualKeyInput}
                        onChange={(e) => setManualKeyInput(e.target.value)}
                        placeholder="Cole sua Gemini API Key aqui..."
                        className="w-full bg-black/40 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                    />
                    <button 
                        onClick={handleManualKeySubmit}
                        disabled={!manualKeyInput || isConnecting}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex justify-center gap-2"
                    >
                        {isConnecting && manualKeyInput ? 'Salvando...' : 'Salvar Chave Manual'}
                    </button>
                    <p className="text-[10px] text-center text-gray-500 mt-2">
                        Não tem uma chave? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Gerar no Google AI Studio</a>
                    </p>
                </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-700/50 flex justify-between items-center">
                <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 font-medium">Sair da Conta</button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11111b] text-gray-100 font-sans selection:bg-brand-500 selection:text-white pb-32 relative">
      <UsageModal isOpen={showUsageModal} onClose={() => setShowUsageModal(false)} />
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
      
      {/* HEADER RESPONSIVO */}
      <header className="border-b border-gray-800 bg-[#1e1e2e] sticky top-0 z-50 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-auto md:h-16 flex flex-col md:flex-row items-center justify-between py-2 md:py-0 gap-2 md:gap-0">
          
          <div className="flex items-center justify-between w-full md:w-auto">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-600 rounded flex items-center justify-center font-bold text-white">AI</div>
                <span className="font-bold tracking-wide text-sm hidden sm:inline">Brav Generator</span>
             </div>
             
             {/* Mobile User Controls */}
             <div className="flex md:hidden items-center gap-3">
                 <div className={`text-[10px] border rounded px-2 py-0.5 flex items-center gap-1 ${ (user?.images_generated || 0) >= (user?.image_limit || 0) ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-dark-800 border-gray-700 text-gray-300' }`}>
                    <span className="font-mono font-bold">{user?.images_generated || 0}/{user?.image_limit || 0}</span>
                 </div>
                 <button onClick={() => setShowUsageModal(true)}><IconSettings /></button>
                 {user?.role === 'admin' && (
                    <button onClick={() => setShowAdminPanel(true)} className="text-purple-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></button>
                 )}
                 <button onClick={logout} className="text-red-400 text-xs font-bold">Sair</button>
             </div>
          </div>
          
          {/* Scrollable Container for Modes on Mobile */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
             {appMode === AppMode.BACKGROUND && (
               <div className="flex bg-dark-900 p-0.5 rounded-lg border border-gray-700 shrink-0">
                  <button onClick={() => setUiMode('QUICK')} className={`px-2 md:px-3 py-1.5 rounded-md text-[9px] md:text-[10px] uppercase font-bold transition-all flex items-center gap-1 ${uiMode === 'QUICK' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}><span>⚡ Rápido</span></button>
                  <button onClick={() => setUiMode('DESIGNER')} className={`px-2 md:px-3 py-1.5 rounded-md text-[9px] md:text-[10px] uppercase font-bold transition-all flex items-center gap-1 ${uiMode === 'DESIGNER' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><span>🎨 Designer</span></button>
               </div>
             )}
             
             <div className="flex bg-dark-900 p-1 rounded-lg border border-gray-700 shrink-0">
                <button onClick={() => setAppMode(AppMode.BACKGROUND)} className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${appMode === AppMode.BACKGROUND ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>BACKGROUND</button>
                <button onClick={() => setAppMode(AppMode.THUMBNAIL)} className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${appMode === AppMode.THUMBNAIL ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>THUMBNAIL</button>
             </div>
          </div>
          
          {/* Desktop User Info */}
          <div className="hidden md:flex items-center gap-4 border-l border-gray-700 pl-4 ml-2">
              <div className="flex flex-col items-end">
                  <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">● Conectado</span>
                  
                  <div className="flex items-center gap-2 mb-0.5">
                     <div className={`text-[10px] border rounded px-2 py-0.5 flex items-center gap-1 ${ (user?.images_generated || 0) >= (user?.image_limit || 0) ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-dark-800 border-gray-700 text-gray-300' }`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="font-mono font-bold">{user?.images_generated || 0} / {user?.image_limit || 0}</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-1">
                     <span className="text-[10px] text-gray-400 font-medium truncate max-w-[80px]">{user?.name}</span>
                     {user?.role === 'admin' && (
                         <span className="text-[8px] bg-red-600 text-white px-1 rounded uppercase font-bold">ADMIN</span>
                     )}
                     <button onClick={logout} className="text-[10px] text-red-400 hover:text-white hover:underline">(Sair)</button>
                  </div>
              </div>

              {user?.role === 'admin' && (
                  <button onClick={() => setShowAdminPanel(true)} className="p-2 bg-purple-900/30 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg transition-colors border border-purple-500/30" title="Painel Admin">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  </button>
              )}

              <button onClick={() => { setManualApiKey(''); setApiKeyReady(false); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Trocar Chave Pessoal"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg></button>
              <button onClick={() => setShowUsageModal(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Configurações & Uso"><IconSettings /></button>
          </div>
        </div>
      </header>
      
      {/* ...rest of App.tsx... */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-4 space-y-4">
            <CollapsibleSection icon={<IconUser />} title="Avatar / Sujeito" defaultOpen={true}>
              <ImageUpload selectedImages={subjectImages} onImagesChange={setSubjectImages} placeholderText="Foto do Apresentador" />
              {appMode === AppMode.BACKGROUND && (
                <>
                {uiMode === 'DESIGNER' && (
                  <div className="space-y-1 mt-2 animate-in fade-in">
                     <label className="text-xs text-gray-400">Descrição do Sujeito</label>
                     <textarea rows={2} className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-xs focus:border-brand-500 outline-none resize-none text-gray-200 placeholder-gray-600" placeholder="Descreva pose, roupa, estilo..." value={bgSettings.subjectDescription} onChange={(e) => setBgSettings({...bgSettings, subjectDescription: e.target.value})} />
                  </div>
                )}
                {uiMode === 'DESIGNER' && (
                  <div className="mt-2 animate-in fade-in">
                    <OptionSelector 
                        label="Enquadramento (Câmera)" 
                        gridCols={3}
                        options={[ { value: Framing.CLOSEUP, label: 'Close-up', icon: <span className="text-xs">😊</span> }, { value: Framing.MID, label: 'Médio', icon: <span className="text-xs">👔</span> }, { value: Framing.AMERICAN, label: 'Americano', icon: <span className="text-xs">🕴️</span> } ]}
                        value={bgSettings.framing}
                        onChange={(val) => setBgSettings({...bgSettings, framing: val})}
                      />
                  </div>
                )}
                </>
              )}
              {appMode !== AppMode.THUMBNAIL && uiMode === 'DESIGNER' && (
                  <div className="mt-2 animate-in fade-in">
                      <OptionSelector label="Posição do Avatar (Desktop)" gridCols={3} options={[ { value: SubjectPosition.LEFT, label: 'Esquerda', icon: <div className="w-3 h-3 bg-gray-500 rounded-sm mr-auto"/> }, { value: SubjectPosition.CENTER, label: 'Centro', icon: <div className="w-3 h-3 bg-gray-500 rounded-sm mx-auto"/> }, { value: SubjectPosition.RIGHT, label: 'Direita', icon: <div className="w-3 h-3 bg-gray-500 rounded-sm ml-auto"/> } ]} value={bgSettings.position} onChange={(val) => setBgSettings({...bgSettings, position: val})} />
                  </div>
              )}
              {appMode === AppMode.THUMBNAIL && (
                  <OptionSelector label="Posição do Avatar" gridCols={2} options={[ { value: 'left', label: 'Esquerda', icon: <div className="w-3 h-3 bg-gray-500 rounded-sm mr-auto"/> }, { value: 'right', label: 'Direita', icon: <div className="w-3 h-3 bg-gray-500 rounded-sm ml-auto"/> } ]} value={thumbSettings.avatarSide} onChange={(val) => setThumbSettings({...thumbSettings, avatarSide: val})} />
              )}
            </CollapsibleSection>

            {appMode === AppMode.BACKGROUND && (
              <CollapsibleSection icon={<IconPresets />} title="Presets & Estilos" defaultOpen={true}>
                 <PresetSelector currentSettings={bgSettings} onSelect={handlePresetSelect} onUpdateSettings={handleUpdateBgSettings} />
              </CollapsibleSection>
            )}

            {appMode === AppMode.BACKGROUND && (
              <>
                <CollapsibleSection icon={<IconSettings />} title={uiMode === 'QUICK' ? "Contexto" : "Contexto & Ambiente"} defaultOpen={true}>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold text-brand-500">Nicho / Profissão</label>
                      <input type="text" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-brand-500 outline-none font-medium" placeholder="Ex: Frentista, Advogado, Gamer" value={bgSettings.niche} onChange={(e) => setBgSettings({...bgSettings, niche: e.target.value})} />
                    </div>
                    {uiMode === 'DESIGNER' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                        <OptionSelector label="Material / Textura Predominante" gridCols={2} options={[ { value: EnvironmentMaterial.ABSTRACT, label: 'Abstrato', icon: <span className="text-[10px]">🎨</span> }, { value: EnvironmentMaterial.CONCRETE, label: 'Concreto', icon: <span className="text-[10px]">🧱</span> }, { value: EnvironmentMaterial.NEON_GRID, label: 'Neon Tech', icon: <span className="text-[10px]">🌃</span> }, { value: EnvironmentMaterial.WOOD, label: 'Madeira', icon: <span className="text-[10px]">🪵</span> }, { value: EnvironmentMaterial.MARBLE, label: 'Mármore', icon: <span className="text-[10px]">🏛️</span> }, { value: EnvironmentMaterial.GLASS, label: 'Vidro/Corp.', icon: <span className="text-[10px]">🏢</span> }, ]} value={bgSettings.environmentMaterial} onChange={(val) => setBgSettings({...bgSettings, environmentMaterial: val})} />
                        <div className="space-y-1">
                          <label className="text-xs text-gray-400">Descrição do Ambiente (Opcional)</label>
                          <input type="text" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-xs focus:border-brand-500 outline-none" placeholder="Ex: Clínica de estética, Textura de mármore..." value={bgSettings.environmentDescription} onChange={(e) => setBgSettings({...bgSettings, environmentDescription: e.target.value})} />
                        </div>
                        <div className="space-y-1 pt-2">
                          <label className="text-xs text-gray-400">Profundidade de Campo (Desfoque)</label>
                          <div className="flex bg-dark-900 rounded-lg p-1 border border-gray-700">
                              {Object.values(DepthLevel).map((depth) => (
                                <button key={depth} onClick={() => setBgSettings({...bgSettings, depthLevel: depth})} className={`flex-1 text-[10px] py-2 rounded transition-all ${bgSettings.depthLevel === depth ? 'bg-gray-700 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}>{depth.split(' (')[0]}</button>
                              ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 pt-2 border-t border-gray-800">
                          <div className="flex items-center justify-between"><span className="text-xs text-gray-300">Usar Referência de Ambiente?</span><Toggle checked={bgSettings.useEnvironmentReference} onChange={(v) => setBgSettings({...bgSettings, useEnvironmentReference: v})} /></div>
                          {bgSettings.useEnvironmentReference && ( <div className="mt-2 animate-in fade-in slide-in-from-top-2 bg-dark-900/50 p-3 rounded-lg border border-gray-700/50"><label className="text-[10px] text-gray-400 uppercase font-bold mb-2 block tracking-wide">Upload da Imagem de Ambiente</label><ImageUpload selectedImages={environmentImages} onImagesChange={setEnvironmentImages} placeholderText="Foto do Local/Cenário" /></div> )}
                          <div className="flex items-center justify-between"><span className="text-xs text-gray-300">Elementos Flutuantes 3D</span><Toggle checked={bgSettings.floatingElements} onChange={(v) => setBgSettings({...bgSettings, floatingElements: v})} /></div>
                          {bgSettings.floatingElements && ( <input type="text" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-2 text-xs focus:border-brand-500 outline-none" placeholder="Ex: Ícones de vidro, partículas..." value={bgSettings.floatingElementsDescription} onChange={(e) => setBgSettings({...bgSettings, floatingElementsDescription: e.target.value})} /> )}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
                {uiMode === 'DESIGNER' && (
                  <CollapsibleSection icon={<IconPalette />} title="Cores & Luz (Cinema)" defaultOpen={false}>
                    <div className="space-y-4">
                        <OptionSelector label="Estilo de Iluminação" gridCols={2} options={[{ value: LightingStyle.STUDIO, label: 'Estúdio Clean', icon: <span className="text-xs">💡</span> }, { value: LightingStyle.CINEMATIC, label: 'Cinemático', icon: <span className="text-xs">🎬</span> }, { value: LightingStyle.NEON, label: 'Neon / Cyber', icon: <span className="text-xs">🌃</span> }, { value: LightingStyle.GOLDEN, label: 'Golden Hour', icon: <span className="text-xs">🌅</span> }, { value: LightingStyle.NATURAL, label: 'Luz Natural', icon: <span className="text-xs">☀️</span> }, { value: LightingStyle.REMBRANDT, label: 'Rembrandt', icon: <span className="text-xs">🎨</span> }]} value={bgSettings.lightingStyle} onChange={(val) => setBgSettings({...bgSettings, lightingStyle: val})} />
                        <OptionSelector label="Color Grading" gridCols={3} options={[{ value: ColorGrading.NEUTRAL, label: 'Neutro', icon: <div className="w-2 h-2 rounded-full bg-gray-400"></div> }, { value: ColorGrading.WARM, label: 'Quente', icon: <div className="w-2 h-2 rounded-full bg-orange-400"></div> }, { value: ColorGrading.COOL, label: 'Frio', icon: <div className="w-2 h-2 rounded-full bg-blue-400"></div> }, { value: ColorGrading.VIBRANT, label: 'Vibrante', icon: <div className="w-2 h-2 rounded-full bg-purple-400"></div> }, { value: ColorGrading.MOODY, label: 'Moody', icon: <div className="w-2 h-2 rounded-full bg-slate-700"></div> }, { value: ColorGrading.MONOCHROME, label: 'B&W', icon: <div className="w-2 h-2 rounded-full bg-white border border-gray-500"></div> }]} value={bgSettings.colorGrading} onChange={(val) => setBgSettings({...bgSettings, colorGrading: val})} />
                        <div className="space-y-3 pt-2 border-t border-gray-800">
                          <span className="text-xs font-bold text-gray-500 uppercase">Luzes Avançadas</span>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Toggle checked={bgSettings.backgroundColor.enabled} onChange={(v) => setBgSettings({...bgSettings, backgroundColor: {...bgSettings.backgroundColor, enabled: v}})} /><span className="text-xs text-gray-400">Cor do Fundo</span></div><div className="flex-1"><ColorPicker label="" value={bgSettings.backgroundColor.value} onChange={(v) => setBgSettings({...bgSettings, backgroundColor: {...bgSettings.backgroundColor, value: v}})} /></div></div>
                            {bgSettings.backgroundColor.enabled && ( <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1"><span className="text-[10px] text-gray-500 w-12">Opacidade</span><input type="range" min="0" max="1" step="0.1" value={bgSettings.backgroundColor.opacity} onChange={(e) => setBgSettings({...bgSettings, backgroundColor: {...bgSettings.backgroundColor, opacity: parseFloat(e.target.value)}})} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500" /><span className="text-[10px] text-gray-300 w-8 text-right">{Math.round(bgSettings.backgroundColor.opacity * 100)}%</span></div> )}
                          </div>
                          <div className="flex items-center justify-between gap-3"><Toggle checked={bgSettings.rimLight.enabled} onChange={(v) => setBgSettings({...bgSettings, rimLight: {...bgSettings.rimLight, enabled: v}})} /><ColorPicker label="Rim Light (Recorte)" value={bgSettings.rimLight.value} onChange={(v) => setBgSettings({...bgSettings, rimLight: {...bgSettings.rimLight, value: v}})} /></div>
                          <div className="flex items-center justify-between gap-3"><Toggle checked={bgSettings.volumetricLight.enabled} onChange={(v) => setBgSettings({...bgSettings, volumetricLight: {...bgSettings.volumetricLight, enabled: v}})} /><ColorPicker label="Luz Volumétrica (Neblina)" value={bgSettings.volumetricLight.value} onChange={(v) => setBgSettings({...bgSettings, volumetricLight: {...bgSettings.volumetricLight, value: v}})} /></div>
                          <div className="flex items-center justify-between gap-3"><Toggle checked={bgSettings.keyLight.enabled} onChange={(v) => setBgSettings({...bgSettings, keyLight: {...bgSettings.keyLight, enabled: v}})} /><ColorPicker label="Luz Principal (Key)" value={bgSettings.keyLight.value} onChange={(v) => setBgSettings({...bgSettings, keyLight: {...bgSettings.keyLight, value: v}})} /></div>
                          <div className="flex items-center justify-between gap-3"><Toggle checked={bgSettings.complementaryLight.enabled} onChange={(v) => setBgSettings({...bgSettings, complementaryLight: {...bgSettings.complementaryLight, enabled: v}})} /><ColorPicker label="Luz Comp. (Fill)" value={bgSettings.complementaryLight.value} onChange={(v) => setBgSettings({...bgSettings, complementaryLight: {...bgSettings.complementaryLight, value: v}})} /></div>
                        </div>
                    </div>
                  </CollapsibleSection>
                )}
              </>
            )}

            <CollapsibleSection icon={<IconLayers />} title={uiMode === 'QUICK' ? "Acabamento (Degradê)" : "Referências Visuais"} defaultOpen={false}>
              <div className="space-y-4">
                  {uiMode === 'QUICK' && (
                     <div className="p-3 bg-dark-900 rounded-lg border border-gray-700 space-y-3 animate-in fade-in">
                        <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded bg-gradient-to-t from-black to-transparent flex items-center justify-center border border-gray-600"><span className="text-white font-bold text-xs">Aa</span></div><div className="flex flex-col"><span className="text-sm font-bold text-white">Degradê para Texto</span><span className="text-[10px] text-gray-400">Essencial para leitura da headline</span></div></div>
                        <div className="flex gap-2">
                           <ColorPicker label="Cor do Fundo/Degradê" value={bgSettings.gradientColor} onChange={(v) => setBgSettings({...bgSettings, gradientColor: v})} />
                        </div>
                        <OptionSelector label="Posição da Sombra" gridCols={2} options={[{ value: GradientDirection.BOTTOM_UP, label: 'Baixo (Padrão)', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> }, { value: GradientDirection.TOP_DOWN, label: 'Cima', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> }, { value: GradientDirection.LEFT_RIGHT, label: 'Esquerda', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> }, { value: GradientDirection.RIGHT_LEFT, label: 'Direita', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> }]} value={bgSettings.gradientDirection} onChange={(v) => setBgSettings({...bgSettings, gradientDirection: v})} />
                     </div>
                  )}
                  {uiMode === 'DESIGNER' && (
                    <>
                      <div className="space-y-1"><label className="text-xs text-gray-400 mb-1 block">{appMode === AppMode.THUMBNAIL ? "Thumbnails de Inspiração (Benchmarking)" : "Referências de Estilo (Imperativo)"}</label><p className="text-[10px] text-gray-500 mb-2">A IA tentará clonar o estilo artístico destas imagens.</p><ImageUpload selectedImages={styleImages} onImagesChange={setStyleImages} withDescriptions={true} placeholderText="Adicionar Referência" /></div>
                      {appMode === AppMode.BACKGROUND && (
                        <>
                            <OptionSelector gridCols={2} options={[ { value: StyleMode.FADE, label: 'Degradê (Fade)', icon: <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-500 to-transparent"/> }, { value: StyleMode.BLUR, label: 'Blur (Foco)', icon: <div className="w-4 h-4 rounded-full bg-gray-500 blur-[2px]"/> }, ]} value={bgSettings.styleMode} onChange={(val) => setBgSettings({...bgSettings, styleMode: val})} />
                            {bgSettings.styleMode === StyleMode.FADE && ( <div className="mt-3 p-3 bg-dark-900 rounded-lg border border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-1"><ColorPicker label="Cor do Degradê" value={bgSettings.gradientColor} onChange={(v) => setBgSettings({...bgSettings, gradientColor: v})} /><OptionSelector label="Direção" gridCols={2} options={[{ value: GradientDirection.BOTTOM_UP, label: 'Baixo ➞ Cima', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> }, { value: GradientDirection.TOP_DOWN, label: 'Cima ➞ Baixo', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> }, { value: GradientDirection.LEFT_RIGHT, label: 'Esq. ➞ Direita', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> }, { value: GradientDirection.RIGHT_LEFT, label: 'Dir. ➞ Esquerda', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> }]} value={bgSettings.gradientDirection} onChange={(v) => setBgSettings({...bgSettings, gradientDirection: v})} /></div> )}
                        </>
                      )}
                    </>
                  )}
              </div>
            </CollapsibleSection>

            {appMode === AppMode.BACKGROUND && (
              <CollapsibleSection icon={<IconAspectRatio />} title="Formato & Saída" defaultOpen={false}>
                 <div className="space-y-4">
                    <div className="space-y-2"><label className="text-xs text-gray-400">Qualidade</label><div className="grid grid-cols-3 gap-2">{Object.values(Resolution).map((res) => ( <button key={res} onClick={() => setBgSettings({...bgSettings, resolution: res})} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${bgSettings.resolution === res ? 'bg-brand-500/20 border-brand-500 text-brand-500' : 'bg-dark-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}>{res}</button> ))}</div></div>
                    {uiMode === 'DESIGNER' && ( <div className="flex items-center justify-between pt-2 border-t border-gray-800 animate-in fade-in"><div className="flex flex-col"><span className="text-sm font-bold text-gray-300">Tamanho Personalizado</span></div><Toggle checked={bgSettings.useCustomSize} onChange={(v) => setBgSettings({...bgSettings, useCustomSize: v})} /></div> )}
                    {uiMode === 'DESIGNER' && bgSettings.useCustomSize && ( <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2"><div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-bold">Largura</label><input type="number" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-sm font-mono focus:border-brand-500 outline-none" value={bgSettings.customWidth} onChange={(e) => setBgSettings({...bgSettings, customWidth: parseInt(e.target.value) || 0})} /></div><div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase font-bold">Altura</label><input type="number" className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-sm font-mono focus:border-brand-500 outline-none" value={bgSettings.customHeight} onChange={(e) => setBgSettings({...bgSettings, customHeight: parseInt(e.target.value) || 0})} /></div></div> )}
                    {uiMode === 'DESIGNER' && ( <div className="flex flex-col gap-2 pt-2 border-t border-gray-800 animate-in fade-in"><div className="flex items-center justify-between"><div className="flex flex-col"><span className="text-xs font-bold text-white">Gerar versão Mobile automaticamente?</span><span className="text-[10px] text-gray-500">Gera versão 9:16 adaptada para celular</span></div><Toggle checked={autoGenerateMobile} onChange={setAutoGenerateMobile} /></div>{autoGenerateMobile && ( <div className="text-[10px] bg-blue-900/20 text-blue-300 p-2 rounded border border-blue-900/50 flex items-center gap-2"><svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Adiciona +1 imagem ao custo total (aprox. R$ 0,67).</span></div> )}</div> )}
                 </div>
              </CollapsibleSection>
            )}

            {/* Sticky Footer Button for Mobile/Desktop */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#11111b]/90 backdrop-blur-md border-t border-gray-800 z-40 lg:relative lg:bg-transparent lg:border-none lg:p-0 lg:backdrop-blur-none lg:z-auto">
               <div className="max-w-[1600px] mx-auto lg:px-0">
                   <button onClick={() => handleGenerate(false)} disabled={isProcessing} className={`w-full py-4 rounded-xl font-bold text-white shadow-2xl transition-all transform border border-white/10 ${isProcessing ? 'bg-dark-800 cursor-not-allowed opacity-75' : appMode === AppMode.THUMBNAIL ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-500 hover:scale-[1.01]' : 'bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 hover:scale-[1.01]'}`}>
                      {isProcessing ? ( <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {appMode === AppMode.THUMBNAIL ? 'CRIANDO THUMB...' : 'RENDERIZANDO...'}</span> ) : appMode === AppMode.THUMBNAIL ? 'GERAR THUMBNAIL' : 'GERAR BACKGROUNDS'}
                   </button>
                   {errorMsg && <p className="mt-2 text-center text-red-400 text-xs bg-red-900/10 p-2 rounded">{errorMsg}</p>}
               </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
             <div className="w-full bg-[#0a0a0f] rounded-2xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
                <div className={`relative w-full ${activeResult?.type === 'mobile' ? 'aspect-[9/16] max-h-[75vh]' : 'aspect-video'} transition-all duration-300 bg-black/50 flex items-center justify-center`}>
                    {activeResult?.loading ? ( <div className="flex flex-col items-center gap-3"><div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${appMode === AppMode.THUMBNAIL ? 'border-red-500' : 'border-brand-500'}`}></div><span className={`text-sm animate-pulse font-medium ${appMode === AppMode.THUMBNAIL ? 'text-red-500' : 'text-brand-500'}`}>{appMode === AppMode.THUMBNAIL ? 'Criando arte viral...' : activeResult?.type === 'mobile' ? 'Adaptando para Mobile...' : 'Processando Desktop...'}</span></div> ) : activeResult?.url ? ( <img src={activeResult.url} alt="Resultado" className="w-full h-full object-contain" /> ) : ( <div className="flex flex-col items-center gap-2 text-gray-600"><svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-sm">O preview aparecerá aqui.</span></div> )}
                </div>
                {activeResult?.url && !activeResult?.loading && (
                  <div className="border-t border-gray-800 bg-[#1e1e2e] p-4 flex flex-col gap-4">
                      {appMode === AppMode.BACKGROUND && viewMode === 'desktop' && !mobileResult?.url && ( <div className="flex items-center justify-between bg-dark-900/50 p-3 rounded-xl border border-gray-700/50 animate-in fade-in slide-in-from-top-1"><div className="flex items-center gap-3"><div className="p-2 bg-brand-500/10 rounded-lg text-brand-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div><div className="flex flex-col"><span className="text-sm font-bold text-white">Versão Mobile</span><span className="text-[10px] text-gray-400">Gerar adaptação vertical</span></div></div><div className="flex items-center gap-2"><div className="flex items-center gap-2 bg-dark-800 border border-gray-600 rounded-lg p-1"><div className="px-2 border-r border-gray-600"><label className="text-[9px] text-gray-500 block uppercase font-bold text-center">Largura</label><input type="number" className="w-12 bg-transparent text-xs text-white text-center outline-none font-mono" value={mobileTargetSize.width} onChange={(e) => setMobileTargetSize({...mobileTargetSize, width: parseInt(e.target.value) || 0})} /></div><div className="px-2"><label className="text-[9px] text-gray-500 block uppercase font-bold text-center">Altura</label><input type="number" className="w-12 bg-transparent text-xs text-white text-center outline-none font-mono" value={mobileTargetSize.height} onChange={(e) => setMobileTargetSize({...mobileTargetSize, height: parseInt(e.target.value) || 0})} /></div></div><button onClick={handleManualMobileGeneration} disabled={isProcessing} className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 h-full">{isProcessing ? '...' : 'Gerar'}</button></div></div> )}
                      <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">{activeResult.type === 'desktop' ? 'Visualizando Desktop' : 'Visualizando Mobile'}</div>
                          <div className="flex items-center gap-3">
                             {appMode === AppMode.BACKGROUND && mobileResult?.url && ( <div className="flex bg-dark-900 rounded-lg p-1 border border-gray-700"><button onClick={() => setViewMode('desktop')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Desktop</button><button onClick={() => setViewMode('mobile')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Mobile</button></div> )}
                             <button onClick={handleCopyToClipboard} className="bg-dark-800 border border-gray-600 hover:border-gray-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2" title="Copiar imagem para área de transferência"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> Copiar</button>
                             <button onClick={handleShareLink} disabled={isSharing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-70">{isSharing ? ( <><svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Gerando...</> ) : ( <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Gerar Link</> )}</button>
                             <button onClick={handleDownload} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download</button>
                          </div>
                      </div>
                  </div>
                )}
             </div>
             {activeResult?.url && ( <div className="relative animate-in fade-in slide-in-from-bottom-2"><div className={`w-full bg-[#1e1e2e] rounded-xl border border-gray-700 p-1 flex items-center shadow-lg transition-colors focus-within:border-white/40`}><input type="text" value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="Ajuste fino (ex: 'Mude a cor do texto para amarelo', 'Faça o rosto mais surpreso')..." className="flex-1 bg-transparent border-none text-sm text-white px-4 py-3 focus:ring-0 placeholder-gray-500" onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleGenerate(true)} /><button onClick={() => handleGenerate(true)} disabled={isProcessing || !refineText.trim()} className="bg-dark-700 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed m-1">{isProcessing ? '...' : 'Refinar'}</button></div><p className="text-[10px] text-gray-500 mt-2 ml-2">*A IA usará a imagem atual como base para a alteração.</p></div> )}
             <HistoryBar history={history} onSelect={handleSelectHistory} />
          </div>
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading, recoveryMode } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#11111b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (recoveryMode) {
    return (
      <>
        <LoginPage />
        <PasswordResetModal />
      </>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Dashboard />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;