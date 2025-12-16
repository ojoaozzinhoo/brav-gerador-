import { supabase } from './supabaseClient';
import { Preset, GenerationSettings, LightingStyle, EnvironmentMaterial, ColorGrading, DepthLevel } from '../types';

// 1. PRESETS PRONTOS (Mantidos no código)
export const PREDEFINED_PRESETS: Preset[] = [
  {
    id: 'preset_smm',
    name: 'SMM / Agency Dark Neon',
    type: 'predefined',
    description: 'Fundo escuro, elementos 3D, Cyber, Marketing Digital.',
    promptExtra: 'Estilo Octo SMM Studio. Fundo escuro com elementos abstratos 3D. Paleta: preto + magenta / rosa vibrante. Clima: ousado, moderno, tech.',
    icon: '🚀',
    color: '#ec4899', // Pink
    settings: {
      lightingStyle: LightingStyle.NEON,
      environmentMaterial: EnvironmentMaterial.NEON_GRID,
      colorGrading: ColorGrading.VIBRANT,
      depthLevel: DepthLevel.MEDIUM,
      backgroundColor: { enabled: true, value: '#000000', opacity: 0.8 },
      rimLight: { enabled: true, value: '#ff00ff' }, // Magenta
      volumetricLight: { enabled: true, value: '#1a1a2e' },
      floatingElements: true,
      floatingElementsDescription: 'Elementos 3D abstratos flutuantes, esferas neon'
    }
  },
  {
    id: 'preset_corporate',
    name: 'Corporate Authority Clean',
    type: 'predefined',
    description: 'Clean, Vidro, Escritório, Confiança B2B.',
    promptExtra: 'Estilo Segurança profissional / serviços técnicos. Fundo clean e desfocado. Sujeito realista com postura confiante. Clima: confiança, profissionalismo.',
    icon: '🏢',
    color: '#3b82f6', // Blue
    settings: {
      lightingStyle: LightingStyle.STUDIO,
      environmentMaterial: EnvironmentMaterial.GLASS,
      colorGrading: ColorGrading.NEUTRAL,
      depthLevel: DepthLevel.HIGH,
      backgroundColor: { enabled: false, value: '#ffffff', opacity: 0 },
      rimLight: { enabled: true, value: '#ffffff' },
      keyLight: { enabled: true, value: '#ffffff' },
      floatingElements: false
    }
  },
  {
    id: 'preset_info',
    name: 'Infoprodutor Cinemático',
    type: 'predefined',
    description: 'Motion Design, Lançamentos, Tecnologia.',
    promptExtra: 'Estilo Motion design / cursos online. Fundo tecnológico com gráficos sutis. Iluminação cinematográfica. Clima: autoridade, inovação.',
    icon: '🎥',
    color: '#8b5cf6', // Violet
    settings: {
      lightingStyle: LightingStyle.CINEMATIC,
      environmentMaterial: EnvironmentMaterial.ABSTRACT,
      colorGrading: ColorGrading.COOL,
      depthLevel: DepthLevel.MEDIUM,
      rimLight: { enabled: true, value: '#60a5fa' }, // Blue rim
      complementaryLight: { enabled: true, value: '#c084fc' },
      floatingElements: true,
      floatingElementsDescription: 'Gráficos sutis, linhas de dados, HUD'
    }
  },
  {
    id: 'preset_luxury',
    name: 'Luxo & Cashflow',
    type: 'predefined',
    description: 'Finanças, Ouro, Mármore, Exclusividade.',
    promptExtra: 'Estilo IA + renda passiva. Fundo escuro com luz dourada. Elementos premium (glow, partículas suaves). Clima: exclusividade, poder.',
    icon: '💰',
    color: '#eab308', // Gold
    settings: {
      lightingStyle: LightingStyle.GOLDEN,
      environmentMaterial: EnvironmentMaterial.MARBLE,
      colorGrading: ColorGrading.WARM,
      depthLevel: DepthLevel.MEDIUM,
      backgroundColor: { enabled: true, value: '#1c1917', opacity: 0.6 }, // Dark Stone
      rimLight: { enabled: true, value: '#fcd34d' }, // Gold
      floatingElements: true,
      floatingElementsDescription: 'Partículas de ouro, poeira mágica'
    }
  },
  {
    id: 'preset_event',
    name: 'Evento / Webinar',
    type: 'predefined',
    description: 'Monocromático, Geométrico, Foco em CTA.',
    promptExtra: 'Estilo Intensivo em anúncios online. Fundo geométrico moderno. Paleta monocromática forte. Composição focada em CTA. Clima: clareza, ação.',
    icon: '🎤',
    color: '#10b981', // Emerald
    settings: {
      lightingStyle: LightingStyle.STUDIO,
      environmentMaterial: EnvironmentMaterial.CONCRETE,
      colorGrading: ColorGrading.VIBRANT,
      depthLevel: DepthLevel.LOW,
      backgroundColor: { enabled: true, value: '#064e3b', opacity: 0.7 }, // Dark Green Tint
      rimLight: { enabled: true, value: '#34d399' },
      floatingElements: false
    }
  },
  {
    id: 'preset_authority',
    name: 'Autoridade Digital Premium',
    type: 'predefined',
    description: 'Futurista, Branding Pessoal, HUDs.',
    promptExtra: 'Estilo Código Autoridade Digital. Fundo futurista com HUDs sutis. Iluminação lateral com glow. Clima: liderança, status.',
    icon: '👑',
    color: '#6366f1', // Indigo
    settings: {
      lightingStyle: LightingStyle.CINEMATIC,
      environmentMaterial: EnvironmentMaterial.GLASS,
      colorGrading: ColorGrading.MOODY,
      depthLevel: DepthLevel.HIGH,
      rimLight: { enabled: true, value: '#818cf8' },
      volumetricLight: { enabled: true, value: '#4338ca' },
      floatingElements: true,
      floatingElementsDescription: 'Interface digital sutil, glow tecnológico'
    }
  }
];

// 2. FUNÇÕES DE SERVIÇO (Async Supabase)

export const getCustomPresets = async (): Promise<Preset[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('user_id', user.id);

  if (error || !data) return [];

  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    type: 'custom',
    description: 'Preset personalizado.',
    promptExtra: `Estilo personalizado: ${item.name}.`,
    settings: item.settings, // JSONB vem direto
    icon: '🎨',
    color: '#9ca3af'
  }));
};

export const saveCustomPreset = async (name: string, settings: GenerationSettings): Promise<Preset | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Faça login para salvar presets.");
    return null;
  }
  
  const presetSettings: Partial<GenerationSettings> = {
     lightingStyle: settings.lightingStyle,
     environmentMaterial: settings.environmentMaterial,
     colorGrading: settings.colorGrading,
     depthLevel: settings.depthLevel,
     backgroundColor: settings.backgroundColor,
     rimLight: settings.rimLight,
     keyLight: settings.keyLight,
     volumetricLight: settings.volumetricLight,
     complementaryLight: settings.complementaryLight,
     floatingElements: settings.floatingElements,
     floatingElementsDescription: settings.floatingElementsDescription,
     niche: settings.niche 
  };

  const { data, error } = await supabase
    .from('presets')
    .insert({
      user_id: user.id,
      name,
      settings: presetSettings
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro ao salvar preset:", error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    type: 'custom',
    description: 'Preset personalizado.',
    promptExtra: `Estilo personalizado: ${data.name}.`,
    settings: data.settings,
    icon: '🎨',
    color: '#9ca3af' 
  };
};

export const deleteCustomPreset = async (id: string): Promise<void> => {
  await supabase.from('presets').delete().eq('id', id);
};