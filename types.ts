
export enum AppMode {
  BACKGROUND = 'Background Elementor',
  THUMBNAIL = 'Thumbnail YouTube'
}

export type UIMode = 'DESIGNER' | 'QUICK';

export enum SubjectPosition {
  LEFT = 'Esquerda',
  CENTER = 'Centro',
  RIGHT = 'Direita'
}

export enum Framing {
  CLOSEUP = 'Close-up (Rosto)',
  MID = 'Plano Médio (Busto)',
  AMERICAN = 'Plano Americano'
}

export enum StyleMode {
  FADE = 'Degradê (Fade)',
  BLUR = 'Blur (Foco)'
}

export enum GradientDirection {
  BOTTOM_UP = 'Baixo p/ Cima',
  TOP_DOWN = 'Cima p/ Baixo',
  LEFT_RIGHT = 'Esq. p/ Direita',
  RIGHT_LEFT = 'Dir. p/ Esquerda'
}

export enum Resolution {
  FHD = '1K', // Full HD aprox
  QHD = '2K', // 2K
  UHD = '4K'  // 4K
}

export enum LightingStyle {
  STUDIO = 'Estúdio Clean',
  CINEMATIC = 'Cinemático (Dramático)',
  NEON = 'Neon / Cyberpunk',
  NATURAL = 'Luz Natural (Soft)',
  GOLDEN = 'Golden Hour (Pôr do Sol)',
  REMBRANDT = 'Rembrandt (Clássico)'
}

export enum ColorGrading {
  NEUTRAL = 'Natural / Neutro',
  WARM = 'Quente (Acolhedor)',
  COOL = 'Frio (Tecnológico)',
  MONOCHROME = 'Preto & Branco',
  VIBRANT = 'Vibrante (Saturado)',
  MOODY = 'Moody (Escuro/Sombrio)'
}

export enum EnvironmentMaterial {
  ABSTRACT = 'Abstrato / Digital',
  CONCRETE = 'Concreto / Industrial',
  WOOD = 'Madeira / Orgânico',
  MARBLE = 'Mármore / Luxo',
  NEON_GRID = 'Grade Neon / Tech',
  NATURE = 'Folhagens / Natureza',
  GLASS = 'Vidro / Corporativo'
}

export enum DepthLevel {
  LOW = 'Foco Nítido (Tudo Visível)',
  MEDIUM = 'Desfoque Suave (Padrão)',
  HIGH = 'Bokeh Intenso (Fundo Borrado)'
}

// --- THUMBNAIL SPECIFIC TYPES ---
export enum ThumbnailVibe {
  CLICKBAIT = 'Alto Impacto (Clickbait)',
  EDUCATIONAL = 'Educativo / Clean',
  GAMING = 'Gaming / Energético',
  VLOG = 'Lifestyle / Vlog',
  TECH = 'Tech / Review',
  HORROR = 'Terror / Misterioso'
}

export enum TextEffect {
  NONE = 'Normal',
  OUTLINE = 'Outline (Contorno)',
  GLOW = 'Neon Glow',
  THREE_D = '3D Pop',
  BOX = 'Fundo Box'
}

export interface ThumbnailSettings {
  // Texto
  mainText: string;
  secondaryText: string;
  textColor: string;
  textEffect: TextEffect;
  
  // Layout
  avatarSide: 'left' | 'right';
  
  // Estilo Básico
  vibe: ThumbnailVibe;
  projectContext: string;
  accentColor: string;

  // --- NEW ADVANCED SETTINGS ---
  environmentMaterial: EnvironmentMaterial;
  depthLevel: DepthLevel;
  lightingStyle: LightingStyle;
  
  // Luzes Individuais
  volumetricLight: { enabled: boolean; value: string };
  keyLight: { enabled: boolean; value: string };
  rimLight: { enabled: boolean; value: string };
  complementaryLight: { enabled: boolean; value: string };
}

export interface GenerationSettings {
  // Sujeito
  subjectDescription: string;
  position: SubjectPosition;
  
  // Contexto
  niche: string;
  environmentDescription: string;
  useEnvironmentReference: boolean;
  environmentMaterial: EnvironmentMaterial;
  depthLevel: DepthLevel;
  floatingElements: boolean;
  floatingElementsDescription: string;

  // Cores & Luz
  lightingStyle: LightingStyle;
  colorGrading: ColorGrading;
  backgroundColor: { enabled: boolean; value: string; opacity: number };
  rimLight: { enabled: boolean; value: string };
  complementaryLight: { enabled: boolean; value: string };
  volumetricLight: { enabled: boolean; value: string };
  keyLight: { enabled: boolean; value: string };
  framing: Framing;

  // Estilo
  styleMode: StyleMode;
  gradientColor: string;
  gradientDirection: GradientDirection;
  
  // Saída
  resolution: Resolution;
  useCustomSize: boolean;
  customWidth: number;
  customHeight: number;

  // Preset Info (para prompt e tracking)
  activePresetId?: string;
  activePresetName?: string;
  activePresetType?: 'predefined' | 'custom';
  presetStyleDescription?: string; // Instruções artísticas extras do preset

  // NEW: Style Cloning
  masterStyleReference: ReferenceImage | null;
}

export interface GeneratedImage {
  id: string;
  url: string;
  type: 'desktop' | 'mobile';
  loading: boolean;
  timestamp: number;
}

export interface ReferenceImage {
  base64: string;
  mimeType: string;
  description?: string;
}

// --- PRESET SYSTEM TYPES ---
export interface Preset {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  description: string; // Descrição visual para o usuário
  promptExtra: string; // Instrução injetada na IA
  
  // As configurações que este preset aplica
  settings: Partial<GenerationSettings>;
  
  // Visual helpers
  icon: string; // Emoji
  color: string; // Hex color code for badge
}

// --- USAGE TRACKING TYPES ---

export interface UsageLog {
  id: string;
  timestamp: string; // ISO String
  action: 'generate' | 'refine';
  uiMode?: UIMode;
  resolution: Resolution;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  // Tracking fields
  presetName?: string;
  presetType?: 'predefined' | 'custom';
}

export interface UsageSummary {
  user_id: string;
  images_generated: number;
  refines_used: number;
  total_images: number;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  estimated_cost_brl: number;
}

// --- PROFILE & ADMIN TYPES ---
export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  image_limit: number;
  images_generated: number;
  allowed_system_key?: boolean; // Se true, pode usar a chave global do sistema
  created_at?: string;
}
