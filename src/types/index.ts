export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export type GenreType = 'rpg' | 'action' | 'visual_novel' | 'mmo' | 'strategy' | 'adventure';

export type TermCategory = 'term' | 'character' | 'location' | 'item' | 'quest';

export interface GlossaryEntry {
  id: string;
  source: string;
  target: string;
  note?: string;
  category: TermCategory;
}

export interface GameProfile {
  id: string;
  name: string;
  genre: GenreType;
  icon: string;
  defaultSourceLang: string;
  characterNames: string[];
  preservedLocations: string[];
  glossary: GlossaryEntry[];
  tone: 'fantasy' | 'colloquial' | 'sci-fi' | 'concise' | 'dramatic';
}

export interface TranslationRecord {
  id: string;
  timestamp: number;
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  speaker?: string;
  gameProfileId: string;
  confidence: number;
  bookmarked?: boolean;
  notes?: string;
  engine: 'gemini' | 'local_heuristic' | 'hybrid';
}

export type OverlayTheme = 'cyber_cyan' | 'fantasy_gold' | 'stealth_dark' | 'glass_blur' | 'clean_high_contrast';
export type OverlayStyleMode = 'subtitle_bar' | 'floating_box' | 'comic_bubble' | 'full_hud';

export interface OverlayConfig {
  theme: OverlayTheme;
  styleMode: OverlayStyleMode;
  fontSize: number; // in px: 14 to 34
  bgOpacity: number; // 0.2 to 1.0
  backdropBlur: boolean;
  textOutline: boolean;
  showSpeaker: boolean;
  showOriginal: boolean;
  autoSpeak: boolean;
  ttsRate: number; // 0.8 to 1.4
  ttsPitch: number; // 0.8 to 1.2
  ttsVoiceName?: string;
}

export type ROIPreset = 'dialogue_bottom' | 'dialogue_center' | 'top_tracker' | 'full' | 'custom';

export interface ROIBox {
  x: number; // percentage 0 to 100
  y: number; // percentage 0 to 100
  width: number; // percentage 0 to 100
  height: number; // percentage 0 to 100
}

export interface CaptureSettings {
  mode: 'sandbox' | 'screen' | 'image_upload';
  roi: ROIBox;
  roiPreset: ROIPreset;
  scanIntervalMs: number;
  isAutoScanning: boolean;
  engine: 'gemini' | 'local_heuristic' | 'hybrid';
  ocrEngine: 'vision_ai' | 'tesseract';
}

export interface GameSceneDialogue {
  speaker: string;
  avatar?: string;
  text: string;
  lang: string;
  contextHint?: string;
}

export interface GameScene {
  id: string;
  title: string;
  genre: GenreType;
  image: string;
  dialogues: GameSceneDialogue[];
  questObjective?: string;
  defaultProfileId: string;
}
