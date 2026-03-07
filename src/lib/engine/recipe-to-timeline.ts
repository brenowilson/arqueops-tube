/**
 * Recipe to Timeline Converter
 * 
 * Converte contexto de Recipe + previousOutputs em Timeline DSL.
 * Usado pelo runner para construir Timeline a partir dos artefatos do job.
 * 
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

import {
    Timeline,
    TimelineSettings,
    Scene,
    Element,
    FormatProfile,
    FORMAT_PRESETS,
    createEmptyTimeline,
    createScene,
    createVideoElement,
    createAudioElement,
    createSubtitleElement,
} from '@/lib/timeline';
import { existsSync } from 'fs';
import path from 'path';

// ===========================================
// TYPES
// ===========================================

export interface RecipeContext {
    /** Recipe slug (graciela, vj, etc) */
    recipeSlug?: string;
    /** Format profile (longform or shorts) */
    format?: FormatProfile;
    /** Background asset path */
    backgroundPath?: string;
    /** Avatar/overlay path */
    avatarPath?: string;
}

/** Image generated for a scene */
export interface GeneratedImage {
    scene_number: number;
    image_path: string;
    timing: {
        start: string;
        end: string;
        duration_seconds: number;
    };
    success: boolean;
}

export interface PreviousOutputs {
    /** TTS output with audio path */
    tts?: {
        audioPath?: string;
        durationSec?: number;
    };
    /** Subtitles path (SRT) */
    subtitles?: {
        srtPath?: string;
    };
    /** Generated images from gerar_imagens step */
    gerar_imagens?: {
        images?: GeneratedImage[];
        images_dir?: string;
    };
}

export interface BuildTimelineOptions {
    /** Job ID for unique references */
    jobId: string;
    /** Recipe context */
    recipe: RecipeContext;
    /** Previous step outputs */
    previousOutputs: PreviousOutputs;
    /** Additional input from job */
    input: Record<string, unknown>;
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Build a Timeline from Recipe context and previous outputs
 */
export function buildTimelineFromRecipe(options: BuildTimelineOptions): Timeline {
    const { jobId, recipe, previousOutputs, input } = options;

    // Determine format profile
    const format: FormatProfile = (input.format as FormatProfile) || recipe.format || 'longform';
    const settings: TimelineSettings = FORMAT_PRESETS[format];

    // Get audio duration (determines video duration)
    const audioDuration = previousOutputs.tts?.durationSec || 60;

    // Build elements list
    const elements: Element[] = [];
    let layerIndex = 0;

    // 1. Background (video or image)
    const backgroundPath = resolveBackgroundPath(recipe, input, settings);
    if (backgroundPath) {
        elements.push(createVideoElement(
            `bg-${jobId}`,
            backgroundPath,
            audioDuration,
            {
                layer: layerIndex++,
                start: 0,
                props: { scale: 1, opacity: 1 },
            }
        ));
    }

    // 2. Audio (TTS)
    const audioPath = previousOutputs.tts?.audioPath;
    if (audioPath) {
        elements.push(createAudioElement(
            `audio-${jobId}`,
            audioPath,
            audioDuration,
            {
                layer: layerIndex++,
                start: 0,
                props: { volume: 1 },
            }
        ));
    }

    // 3. Generated Images (with timing from scene prompts)
    const generatedImages = previousOutputs.gerar_imagens?.images || [];
    const successfulImages = generatedImages.filter(img => img.success && img.image_path && existsSync(img.image_path));

    if (successfulImages.length > 0) {
        for (const img of successfulImages) {
            // Parse timing (format "M:SS")
            const parseTime = (timeStr: string): number => {
                const parts = timeStr.split(':');
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            };

            const startSec = parseTime(img.timing.start);
            const durationSec = img.timing.duration_seconds;

            elements.push(createVideoElement(
                `img-scene-${img.scene_number}`,
                img.image_path,
                durationSec,
                {
                    layer: layerIndex, // Same layer for all images (they replace each other)
                    start: startSec,
                    props: { scale: 1, opacity: 1 },
                }
            ));
        }
        layerIndex++;
    }

    // 4. Subtitles (if available)
    const srtPath = previousOutputs.subtitles?.srtPath || findSrtPath(jobId);
    if (srtPath && existsSync(srtPath)) {
        elements.push(createSubtitleElement(
            `subs-${jobId}`,
            srtPath,
            audioDuration,
            format === 'shorts' ? 'shorts' : 'default'
        ));
    }

    // Create single scene with all elements
    const scene: Scene = createScene('scene-main', 0, audioDuration, elements);

    // Build timeline
    const timeline: Timeline = {
        ...createEmptyTimeline(format),
        scenes: [scene],
    };

    return timeline;
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Resolve background asset path based on recipe and input
 */
function resolveBackgroundPath(
    recipe: RecipeContext,
    input: Record<string, unknown>,
    settings: TimelineSettings
): string | undefined {
    // Priority 1: Explicit path from input
    if (input.backgroundPath && typeof input.backgroundPath === 'string') {
        if (existsSync(input.backgroundPath)) {
            return input.backgroundPath;
        }
    }

    if (input.avatarPath && typeof input.avatarPath === 'string') {
        if (existsSync(input.avatarPath)) {
            return input.avatarPath;
        }
    }

    // Priority 2: Recipe specified path
    if (recipe.backgroundPath && existsSync(recipe.backgroundPath)) {
        return recipe.backgroundPath;
    }

    if (recipe.avatarPath && existsSync(recipe.avatarPath)) {
        return recipe.avatarPath;
    }

    // Priority 3: Auto-discover from recipe folder
    const recipeSlug = recipe.recipeSlug || (input.recipeSlug as string) || 'graciela';
    const resolutionSuffix = getResolutionSuffix(settings);

    // Try channel assets folder (new structure)
    const channelPaths = [
        path.join(process.cwd(), 'public', 'assets', 'channels', recipeSlug, `avatar${resolutionSuffix}.png`),
        path.join(process.cwd(), 'public', 'assets', 'channels', recipeSlug, 'avatar-original.png'),
    ];

    for (const p of channelPaths) {
        if (existsSync(p)) return p;
    }

    // Try legacy recipes folder
    const legacyPaths = [
        path.join(process.cwd(), 'recipes', recipeSlug, 'assets', `avatar${resolutionSuffix}.png`),
        path.join(process.cwd(), 'recipes', recipeSlug, 'assets', 'avatar.png'),
    ];

    for (const p of legacyPaths) {
        if (existsSync(p)) return p;
    }

    return undefined;
}

/**
 * Get resolution suffix based on settings
 */
function getResolutionSuffix(settings: TimelineSettings): string {
    if (settings.height >= 1080) return '_1080p';
    if (settings.height >= 720) return '_720p';
    return '';
}

/**
 * Try to find SRT file in job artifacts
 */
function findSrtPath(jobId: string): string | undefined {
    const possiblePaths = [
        path.join(process.cwd(), 'jobs', jobId, 'subtitles', 'output.srt'),
        path.join(process.cwd(), 'jobs', jobId, 'parse_ssml', 'subtitles.srt'),
    ];

    for (const p of possiblePaths) {
        if (existsSync(p)) return p;
    }

    return undefined;
}
