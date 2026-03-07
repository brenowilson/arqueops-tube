/**
 * Timeline DSL Schema
 *
 * Define a estrutura declarativa para composição de vídeos.
 * Inspirado em JSON2Video, adaptado para Video Factory OS.
 *
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

// ===========================================
// TIMELINE TYPES
// ===========================================

export interface Timeline {
  version: string;
  settings: TimelineSettings;
  scenes: Scene[];
}

export interface TimelineSettings {
  /** Largura em pixels (ex: 1920 para 16:9, 1080 para 9:16) */
  width: number;
  /** Altura em pixels (ex: 1080 para 16:9, 1920 para 9:16) */
  height: number;
  /** Frames por segundo */
  fps: number;
  /** Cor de fundo (hex) */
  backgroundColor?: string;
}

export interface Scene {
  id: string;
  /** Início em segundos desde o começo do vídeo */
  start: number;
  /** Duração em segundos */
  duration: number;
  /** Elementos da cena (ordenados por layer) */
  elements: Element[];
}

export interface Element {
  id: string;
  type: ElementType;
  /** Z-index (0 = fundo, maiores = mais à frente) */
  layer: number;
  /** Início relativo à cena (segundos) */
  start: number;
  /** Duração em segundos */
  duration: number;
  /** Caminho do asset (para video, audio, image) */
  src?: string;
  /** Propriedades específicas do tipo */
  props: ElementProps;
}

export type ElementType = 'video' | 'audio' | 'image' | 'text' | 'subtitle';

export interface ElementProps {
  // Video/Image positioning
  position?: { x: number; y: number };
  scale?: number;
  opacity?: number;

  // Audio
  /** Volume de 0 a 1 */
  volume?: number;
  /** Fade in em segundos */
  fadeIn?: number;
  /** Fade out em segundos */
  fadeOut?: number;

  // Text
  content?: string;
  font?: string;
  fontSize?: number;
  color?: string;

  // Subtitle
  srtPath?: string;
  assPath?: string;
  style?: SubtitleStyle;
}

export type SubtitleStyle = 'default' | 'shorts' | 'custom';

// ===========================================
// FORMAT PROFILES (16:9 vs 9:16)
// ===========================================

export type FormatProfile = 'longform' | 'shorts';

export const FORMAT_PRESETS: Record<FormatProfile, TimelineSettings> = {
  longform: {
    width: 1920,
    height: 1080,
    fps: 30,
    backgroundColor: '#000000',
  },
  shorts: {
    width: 1080,
    height: 1920,
    fps: 30,
    backgroundColor: '#000000',
  },
};

// ===========================================
// SAFE AREAS (para shorts com UI overlays)
// ===========================================

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const SAFE_AREAS: Record<string, SafeArea> = {
  'youtube-shorts': { top: 120, bottom: 150, left: 20, right: 20 },
  'tiktok': { top: 100, bottom: 180, left: 20, right: 20 },
  'instagram-reels': { top: 110, bottom: 160, left: 20, right: 20 },
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calcula a duração total da timeline
 */
export function getTimelineDuration(timeline: Timeline): number {
  if (timeline.scenes.length === 0) return 0;

  return Math.max(
    ...timeline.scenes.map((scene) => scene.start + scene.duration)
  );
}

/**
 * Cria uma timeline vazia com settings padrão
 */
export function createEmptyTimeline(profile: FormatProfile = 'longform'): Timeline {
  return {
    version: '1.0.0',
    settings: FORMAT_PRESETS[profile],
    scenes: [],
  };
}

/**
 * Cria uma cena a partir de elementos
 */
export function createScene(
  id: string,
  start: number,
  duration: number,
  elements: Element[]
): Scene {
  return { id, start, duration, elements };
}

/**
 * Cria um elemento de vídeo
 */
export function createVideoElement(
  id: string,
  src: string,
  duration: number,
  options?: Partial<Pick<Element, 'layer' | 'start' | 'props'>>
): Element {
  return {
    id,
    type: 'video',
    layer: options?.layer ?? 0,
    start: options?.start ?? 0,
    duration,
    src,
    props: options?.props ?? {},
  };
}

/**
 * Cria um elemento de áudio
 */
export function createAudioElement(
  id: string,
  src: string,
  duration: number,
  options?: Partial<Pick<Element, 'layer' | 'start' | 'props'>>
): Element {
  return {
    id,
    type: 'audio',
    layer: options?.layer ?? 1,
    start: options?.start ?? 0,
    duration,
    src,
    props: { volume: 1, ...options?.props },
  };
}

/**
 * Cria um elemento de legenda
 */
export function createSubtitleElement(
  id: string,
  srtPath: string,
  duration: number,
  style: SubtitleStyle = 'default'
): Element {
  return {
    id,
    type: 'subtitle',
    layer: 10, // legendas sempre no topo
    start: 0,
    duration,
    props: { srtPath, style },
  };
}
