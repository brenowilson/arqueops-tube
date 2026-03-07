/**
 * FFmpeg Presets Registry
 * 
 * Presets configuráveis para encoding de vídeo.
 * Foco em VideoToolbox (hardware acceleration no Mac M1/M2).
 * 
 * Gate 2.4: Presets FFmpeg (VideoToolbox profiles)
 * 
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

import { VideoEncodePreset } from '@/lib/timeline';

// ===========================================
// PRESET REGISTRY
// ===========================================

export interface PresetRegistry {
    presets: Record<string, VideoEncodePreset>;
    defaultPreset: string;
}

/**
 * Default preset registry with VideoToolbox profiles
 */
export const PRESET_REGISTRY: PresetRegistry = {
    defaultPreset: 'longform-videotoolbox',
    presets: {
        // ==========================================
        // PRODUCTION PRESETS (VideoToolbox - Mac)
        // ==========================================

        'longform-videotoolbox': {
            name: 'Longform VideoToolbox (1080p)',
            encoder: 'h264_videotoolbox',
            scale: '1920:1080',
            fps: 30,
            bitrate: '4M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
        },

        'longform-videotoolbox-4k': {
            name: 'Longform VideoToolbox (4K)',
            encoder: 'h264_videotoolbox',
            scale: '3840:2160',
            fps: 30,
            bitrate: '15M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '320k',
        },

        'shorts-videotoolbox': {
            name: 'Shorts VideoToolbox (9:16)',
            encoder: 'h264_videotoolbox',
            scale: '1080:1920',
            fps: 30,
            bitrate: '6M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
        },

        'shorts-videotoolbox-hq': {
            name: 'Shorts VideoToolbox HQ (9:16)',
            encoder: 'h264_videotoolbox',
            scale: '1080:1920',
            fps: 60,
            bitrate: '10M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '256k',
        },

        // ==========================================
        // HEVC PRESETS (Better compression)
        // ==========================================

        'longform-hevc': {
            name: 'Longform HEVC (1080p)',
            encoder: 'hevc_videotoolbox',
            scale: '1920:1080',
            fps: 30,
            bitrate: '3M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
        },

        'shorts-hevc': {
            name: 'Shorts HEVC (9:16)',
            encoder: 'hevc_videotoolbox',
            scale: '1080:1920',
            fps: 30,
            bitrate: '4M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
        },

        // ==========================================
        // SOFTWARE FALLBACK (quando VideoToolbox indisponível)
        // ==========================================

        'longform-libx264': {
            name: 'Longform libx264 (Software)',
            encoder: 'libx264',
            scale: '1920:1080',
            fps: 30,
            bitrate: '4M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
            extraArgs: ['-preset', 'medium'],
        },

        'shorts-libx264': {
            name: 'Shorts libx264 (Software)',
            encoder: 'libx264',
            scale: '1080:1920',
            fps: 30,
            bitrate: '6M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
            extraArgs: ['-preset', 'medium'],
        },

        // ==========================================
        // DRAFT PRESETS (Rápido para preview)
        // ==========================================

        'draft-fast': {
            name: 'Draft Fast (720p)',
            encoder: 'libx264',
            scale: '1280:720',
            fps: 30,
            bitrate: '2M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '128k',
            extraArgs: ['-preset', 'ultrafast'],
        },

        'draft-shorts': {
            name: 'Draft Shorts (9:16 720p)',
            encoder: 'libx264',
            scale: '720:1280',
            fps: 30,
            bitrate: '2M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '128k',
            extraArgs: ['-preset', 'ultrafast'],
        },

        // ==========================================
        // PLATFORM-SPECIFIC PRESETS
        // ==========================================

        'youtube-optimized': {
            name: 'YouTube Optimized (1080p)',
            encoder: 'h264_videotoolbox',
            scale: '1920:1080',
            fps: 30,
            bitrate: '8M', // Higher for YouTube re-encoding
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '256k',
            extraArgs: ['-profile:v', 'high', '-level', '4.2'],
        },

        'youtube-shorts': {
            name: 'YouTube Shorts (1080x1920)',
            encoder: 'h264_videotoolbox',
            scale: '1080:1920',
            fps: 30,
            bitrate: '8M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
        },

        'tiktok': {
            name: 'TikTok (1080x1920)',
            encoder: 'h264_videotoolbox',
            scale: '1080:1920',
            fps: 30,
            bitrate: '6M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
        },

        'instagram-reels': {
            name: 'Instagram Reels (1080x1920)',
            encoder: 'h264_videotoolbox',
            scale: '1080:1920',
            fps: 30,
            bitrate: '5M',
            pixelFormat: 'yuv420p',
            audioCodec: 'aac',
            audioBitrate: '192k',
        },
    },
};

// ===========================================
// PRESET HELPERS
// ===========================================

/**
 * Get a preset by name
 */
export function getPreset(name: string): VideoEncodePreset | null {
    return PRESET_REGISTRY.presets[name] ?? null;
}

/**
 * Get the default preset
 */
export function getDefaultPreset(): VideoEncodePreset {
    return PRESET_REGISTRY.presets[PRESET_REGISTRY.defaultPreset];
}

/**
 * Get preset for format profile
 */
export function getPresetForFormat(
    format: 'longform' | 'shorts',
    quality: 'draft' | 'standard' | 'high' = 'standard'
): VideoEncodePreset {
    const mapping: Record<string, string> = {
        'longform-draft': 'draft-fast',
        'longform-standard': 'longform-videotoolbox',
        'longform-high': 'longform-videotoolbox-4k',
        'shorts-draft': 'draft-shorts',
        'shorts-standard': 'shorts-videotoolbox',
        'shorts-high': 'shorts-videotoolbox-hq',
    };

    const key = `${format}-${quality}`;
    return PRESET_REGISTRY.presets[mapping[key]] ?? getDefaultPreset();
}

/**
 * Get preset for platform
 */
export function getPresetForPlatform(
    platform: 'youtube' | 'youtube-shorts' | 'tiktok' | 'instagram-reels'
): VideoEncodePreset {
    const mapping: Record<string, string> = {
        'youtube': 'youtube-optimized',
        'youtube-shorts': 'youtube-shorts',
        'tiktok': 'tiktok',
        'instagram-reels': 'instagram-reels',
    };

    return PRESET_REGISTRY.presets[mapping[platform]] ?? getDefaultPreset();
}

/**
 * List all available presets
 */
export function listPresets(): Array<{ name: string; preset: VideoEncodePreset }> {
    return Object.entries(PRESET_REGISTRY.presets).map(([name, preset]) => ({
        name,
        preset,
    }));
}

/**
 * Check if VideoToolbox is available (Mac only)
 */
export async function isVideoToolboxAvailable(): Promise<boolean> {
    try {
        const { exec } = require('child_process');
        return new Promise((resolve) => {
            exec('ffmpeg -encoders 2>&1 | grep videotoolbox', (error: Error | null, stdout: string) => {
                resolve(!error && stdout.includes('videotoolbox'));
            });
        });
    } catch {
        return false;
    }
}

/**
 * Get best available preset for current system
 */
export async function getBestPreset(format: 'longform' | 'shorts'): Promise<VideoEncodePreset> {
    const hasVideoToolbox = await isVideoToolboxAvailable();

    if (hasVideoToolbox) {
        return format === 'shorts'
            ? PRESET_REGISTRY.presets['shorts-videotoolbox']
            : PRESET_REGISTRY.presets['longform-videotoolbox'];
    }

    // Fallback to software encoding
    return format === 'shorts'
        ? PRESET_REGISTRY.presets['shorts-libx264']
        : PRESET_REGISTRY.presets['longform-libx264'];
}
