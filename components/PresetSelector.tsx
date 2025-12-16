import React, { useState, useEffect } from 'react';
import { Preset, GenerationSettings, ReferenceImage } from '../types';
import { PREDEFINED_PRESETS, getCustomPresets, deleteCustomPreset, saveCustomPreset } from '../services/presetService';
import { ImageUpload } from './ImageUpload';

interface PresetSelectorProps {
  currentSettings: GenerationSettings;
  onSelect: (preset: Preset) => void;
  // We need to update settings directly for the clone feature
  onUpdateSettings?: (settings: Partial<GenerationSettings>) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ currentSettings, onSelect, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom' | 'clone'>('predefined');
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load custom presets asynchronously
  useEffect(() => {
    const fetchPresets = async () => {
        setIsLoading(true);
        const presets = await getCustomPresets();
        setCustomPresets(presets);
        setIsLoading(false);
    };
    if (activeTab === 'custom') {
        fetchPresets();
    }
  }, [activeTab]);

  const handleSave = async () => {
    if (!newPresetName.trim()) return;
    setIsSaving(true); // Bloqueia UI
    const saved = await saveCustomPreset(newPresetName, currentSettings);
    if (saved) {
        setCustomPresets([...customPresets, saved]);
        setNewPresetName('');
        // Auto select the new preset
        onSelect(saved);
        setActiveTab('custom'); // Switch to see the new preset
    }
    setIsSaving(false); // Retorna UI para estado normal (botão salvar visível novamente se quiser criar outro)
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm('Excluir este preset?')) {
        await deleteCustomPreset(id);
        setCustomPresets(customPresets.filter(p => p.id !== id));
    }
  };

  const handleCloneImageChange = (images: ReferenceImage[]) => {
    if (onUpdateSettings) {
        onUpdateSettings({ masterStyleReference: images.length > 0 ? images[0] : null });
    }
  };

  // If we have a master reference, we might want to highlight the Clone tab
  useEffect(() => {
    if (currentSettings.masterStyleReference && activeTab !== 'clone') {
        // Optional: switch to clone tab if user uploaded something elsewhere, but usually we just keep state
    }
  }, [currentSettings.masterStyleReference]);

  const presetsToShow = activeTab === 'predefined' ? PREDEFINED_PRESETS : customPresets;

  return (
    <div className="bg-[#1e1e2e] p-5 rounded-xl border border-gray-800 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <span className="text-brand-500">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
           </span>
           <h3 className="text-base font-bold text-white">Presets & Estilos</h3>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-dark-900 p-1 rounded-lg border border-gray-700">
           <button onClick={() => setActiveTab('predefined')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'predefined' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>PRONTOS</button>
           <button onClick={() => setActiveTab('custom')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'custom' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>MEUS PRESETS</button>
           <button onClick={() => setActiveTab('clone')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${activeTab === 'clone' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-purple-400'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              CLONAR IMAGEM
           </button>
        </div>
      </div>

      {activeTab === 'clone' ? (
        <div className="animate-in fade-in slide-in-from-right-4">
            <div className="bg-purple-900/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 mt-1">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1">Clonagem de Estilo (Blueprint Visual)</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Envie uma imagem de referência e a IA analisará a iluminação, texturas, cores e composição para 
                            construir seu background <strong>EXATAMENTE</strong> com a mesma estética, adaptando para o seu nicho.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Imagem de Referência Mestre</label>
                <ImageUpload 
                    selectedImages={currentSettings.masterStyleReference ? [currentSettings.masterStyleReference] : []} 
                    onImagesChange={handleCloneImageChange} 
                    placeholderText="Enviar imagem para clonar estilo"
                />
                {currentSettings.masterStyleReference && (
                    <div className="flex items-center gap-2 text-[10px] text-purple-300 mt-2 bg-purple-900/20 p-2 rounded border border-purple-900/50">
                        <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        O Estilo desta imagem terá prioridade sobre outras configurações de luz e cor.
                    </div>
                )}
            </div>
        </div>
      ) : (
        <>
            {/* Preset Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4 animate-in fade-in">
                {activeTab === 'custom' && isLoading ? (
                    <div className="col-span-2 text-center py-6 text-gray-500 text-xs">Carregando seus presets...</div>
                ) : (
                    presetsToShow.map((preset) => (
                        <button
                        key={preset.id}
                        onClick={() => onSelect(preset)}
                        className={`relative p-3 rounded-xl border transition-all text-left group overflow-hidden ${currentSettings.activePresetId === preset.id ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700 bg-dark-900 hover:border-gray-500'}`}
                        >
                        <div className="flex items-start justify-between mb-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-black/30 border border-white/10">
                                {preset.icon}
                            </div>
                            {activeTab === 'custom' && (
                                <div onClick={(e) => handleDelete(e, preset.id)} className="text-gray-600 hover:text-red-500 p-1 cursor-pointer">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </div>
                            )}
                        </div>
                        
                        <div className="relative z-10">
                            <h4 className="text-xs font-bold text-gray-200 leading-tight mb-1">{preset.name}</h4>
                            <p className="text-[9px] text-gray-500 line-clamp-2 leading-tight">{preset.description}</p>
                        </div>

                        {/* Color Badge */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${preset.color}20, transparent 70%)` }}></div>
                        <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: preset.color }}></div>
                        </button>
                    ))
                )}
                
                {!isLoading && presetsToShow.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-gray-500 text-xs italic">
                    Nenhum preset encontrado.
                    </div>
                )}
            </div>

            {/* Save Custom Preset Area */}
            {activeTab === 'custom' && isSaving ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <input 
                    type="text" 
                    className="flex-1 bg-dark-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-brand-500 outline-none"
                    placeholder="Nome do Preset..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    autoFocus
                    />
                    <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg text-xs font-bold">Salvar</button>
                    <button onClick={() => setIsSaving(false)} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg text-xs">X</button>
                </div>
            ) : (
                <button 
                    onClick={() => setIsSaving(true)}
                    className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-xs text-gray-400 hover:text-white hover:border-brand-500 hover:bg-brand-500/5 transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Salvar Configuração Atual como Preset
                </button>
            )}
        </>
      )}

    </div>
  );
};