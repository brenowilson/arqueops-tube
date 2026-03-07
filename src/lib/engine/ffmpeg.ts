/**
 * FFmpeg Module - Video Rendering com VideoToolbox
 *
 * Render de vídeo com áudio + imagem de fundo.
 * Usa VideoToolbox (h264_videotoolbox) para aceleração no Mac.
 *
 * SERVER-ONLY: Este módulo só pode ser usado no servidor.
 */

import { existsSync } from 'fs';
import { stat } from 'fs/promises';

// Types
type FfmpegCommand = ReturnType<typeof import('fluent-ffmpeg')>;

// Lazy load ffmpeg para evitar bundling no webpack
let ffmpegModule: typeof import('fluent-ffmpeg') | null = null;

async function getFFmpeg(): Promise<typeof import('fluent-ffmpeg')> {
    if (!ffmpegModule) {
        // Dynamic import para evitar problemas com webpack
        const ffmpeg = (await import('fluent-ffmpeg')).default;

        // Configurar ffmpeg path
        try {
            const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
            ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        } catch {
            console.log('[FFmpeg] Using system ffmpeg');
        }

        // Configurar ffprobe path usando require para evitar problemas de bundling
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const ffprobePath = require('@ffprobe-installer/ffprobe').path;
            ffmpeg.setFfprobePath(ffprobePath);
        } catch {
            console.log('[FFmpeg] Using system ffprobe');
        }

        ffmpegModule = ffmpeg;
    }
    return ffmpegModule;
}

export interface VideoPreset {
    encoder: string;       // 'h264_videotoolbox' | 'libx264'
    scale: string;         // '1920:1080' | '1280:720'
    fps: number;           // 30 | 60
    bitrate: string;       // '4M' | '8M'
    pixelFormat: string;   // 'yuv420p'
    audioCodec: string;    // 'aac'
    audioBitrate: string;  // '192k'
}

export interface RenderOptions {
    audioPath: string;
    backgroundImagePath?: string;
    outputPath: string;
    preset: VideoPreset;
}

export interface RenderResult {
    success: boolean;
    outputPath?: string;
    durationSec?: number;
    fileSizeBytes?: number;
    error?: {
        code: string;
        message: string;
        stderr?: string;
    };
}

// Preset padrão para fallback
const DEFAULT_PRESET: VideoPreset = {
    encoder: 'libx264',
    scale: '1280:720',
    fps: 30,
    bitrate: '4M',
    pixelFormat: 'yuv420p',
    audioCodec: 'aac',
    audioBitrate: '192k',
};

// Imagem preta padrão para quando não há background
const DEFAULT_BACKGROUND_COLOR = 'black';

/**
 * Obtém duração de arquivo de áudio em segundos
 */
export async function getAudioDuration(audioPath: string): Promise<number | null> {
    const ffmpeg = await getFFmpeg();
    return new Promise((resolve) => {
        ffmpeg.ffprobe(audioPath, (err: Error | null, metadata: { format?: { duration?: number } }) => {
            if (err || !metadata.format?.duration) {
                resolve(null);
                return;
            }
            resolve(metadata.format.duration);
        });
    });
}

/**
 * Obtém duração de arquivo de vídeo em segundos
 */
export async function getVideoDuration(videoPath: string): Promise<number | null> {
    const ffmpeg = await getFFmpeg();
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: { format?: { duration?: number } }) => {
            if (err || !metadata.format?.duration) {
                resolve(null);
                return;
            }
            resolve(metadata.format.duration);
        });
    });
}

/**
 * Renderiza vídeo a partir de áudio + imagem de fundo
 */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
    const { audioPath, backgroundImagePath, outputPath, preset } = options;
    const effectivePreset = { ...DEFAULT_PRESET, ...preset };

    // Validate audio exists
    if (!existsSync(audioPath)) {
        return {
            success: false,
            error: {
                code: 'AUDIO_NOT_FOUND',
                message: `Arquivo de áudio não encontrado: ${audioPath}`,
            },
        };
    }

    // Get audio duration first
    const audioDuration = await getAudioDuration(audioPath);
    if (!audioDuration) {
        return {
            success: false,
            error: {
                code: 'AUDIO_DURATION_ERROR',
                message: 'Não foi possível obter duração do áudio',
            },
        };
    }

    const ffmpeg = await getFFmpeg();
    const [width, height] = effectivePreset.scale.split(':').map(Number);

    return new Promise((resolve) => {
        let command: FfmpegCommand;

        if (backgroundImagePath && existsSync(backgroundImagePath)) {
            // Com imagem de fundo
            command = ffmpeg()
                .input(backgroundImagePath)
                .inputOptions(['-loop', '1'])
                .input(audioPath)
                .outputOptions([
                    '-c:v', effectivePreset.encoder,
                    '-pix_fmt', effectivePreset.pixelFormat,
                    '-b:v', effectivePreset.bitrate,
                    '-r', String(effectivePreset.fps),
                    '-vf', `scale=${effectivePreset.scale}:force_original_aspect_ratio=decrease,pad=${effectivePreset.scale}:(ow-iw)/2:(oh-ih)/2`,
                    '-c:a', effectivePreset.audioCodec,
                    '-b:a', effectivePreset.audioBitrate,
                    '-shortest',
                    '-movflags', '+faststart',
                ]);
        } else {
            // Sem imagem de fundo - gera fundo preto
            command = ffmpeg()
                .input(`color=c=${DEFAULT_BACKGROUND_COLOR}:s=${width}x${height}:r=${effectivePreset.fps}`)
                .inputFormat('lavfi')
                .inputOptions(['-t', String(audioDuration)])
                .input(audioPath)
                .outputOptions([
                    '-c:v', effectivePreset.encoder,
                    '-pix_fmt', effectivePreset.pixelFormat,
                    '-b:v', effectivePreset.bitrate,
                    '-c:a', effectivePreset.audioCodec,
                    '-b:a', effectivePreset.audioBitrate,
                    '-shortest',
                    '-movflags', '+faststart',
                ]);
        }

        (command as any)
            .output(outputPath)
            .on('end', async () => {
                try {
                    const stats = await stat(outputPath);
                    resolve({
                        success: true,
                        outputPath,
                        durationSec: audioDuration,
                        fileSizeBytes: stats.size,
                    });
                } catch {
                    resolve({
                        success: true,
                        outputPath,
                        durationSec: audioDuration,
                    });
                }
            })
            .on('error', (err: Error, _stdout: string, stderr: string) => {
                console.error('[FFmpeg Error]', err.message);
                console.error('[FFmpeg Stderr]', stderr);

                // Retry with libx264 if VideoToolbox fails
                if (effectivePreset.encoder === 'h264_videotoolbox') {
                    console.log('[FFmpeg] Retrying with libx264...');
                    renderVideo({
                        ...options,
                        preset: { ...effectivePreset, encoder: 'libx264' },
                    }).then(resolve);
                    return;
                }

                resolve({
                    success: false,
                    error: {
                        code: 'FFMPEG_ERROR',
                        message: err.message,
                        stderr: stderr?.substring(0, 1000),
                    },
                });
            })
            .run();
    });
}

/**
 * Extrai thumbnail de um vídeo
 */
export async function extractThumbnail(
    videoPath: string,
    outputPath: string,
    timePercentage = 50
): Promise<{ success: boolean; thumbnailPath?: string; error?: string }> {
    if (!existsSync(videoPath)) {
        return { success: false, error: 'Vídeo não encontrado' };
    }

    // Get video duration
    const duration = await getVideoDuration(videoPath);
    if (!duration) {
        return { success: false, error: 'Não foi possível obter duração do vídeo' };
    }

    const seekTime = (duration * timePercentage) / 100;
    const ffmpeg = await getFFmpeg();

    return new Promise((resolve) => {
        (ffmpeg(videoPath) as any)
            .seekInput(seekTime)
            .outputOptions(['-vframes', '1', '-q:v', '2'])
            .output(outputPath)
            .on('end', () => {
                resolve({ success: true, thumbnailPath: outputPath });
            })
            .on('error', (err: Error) => {
                resolve({ success: false, error: err.message });
            })
            .run();
    });
}

/**
 * Verifica se FFmpeg está disponível
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
    try {
        const ffmpeg = await getFFmpeg();
        return new Promise((resolve) => {
            ffmpeg.getAvailableFormats((err: Error | null) => {
                resolve(!err);
            });
        });
    } catch {
        return false;
    }
}
