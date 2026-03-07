/**
 * Export Module - Empacotamento de Artifacts
 *
 * Consolida todos artifacts de um job em estrutura organizada
 * com manifest JSON e thumbnail.
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { extractThumbnail } from './ffmpeg';

export interface ExportOptions {
    jobId: string;
    artifactsDir: string;
    previousOutputs: Record<string, unknown>;
    manifest: Record<string, unknown>;
}

export interface ExportResult {
    success: boolean;
    exportPath?: string;
    thumbnailPath?: string;
    manifestPath?: string;
    totalSizeBytes?: number;
    error?: {
        code: string;
        message: string;
    };
}

interface ArtifactInfo {
    stepKey: string;
    filename: string;
    path: string;
    sizeBytes: number;
    type: string;
}

/**
 * Exporta job com todos artifacts organizados
 */
export async function exportJob(options: ExportOptions): Promise<ExportResult> {
    const { jobId, artifactsDir, previousOutputs, manifest } = options;

    try {
        // Criar diretório de export
        const exportDir = join(artifactsDir, 'export');
        if (!existsSync(exportDir)) {
            mkdirSync(exportDir, { recursive: true });
        }

        // Coletar todos artifacts
        const artifacts: ArtifactInfo[] = [];
        let totalSize = 0;

        // Scan directories de steps
        if (existsSync(artifactsDir)) {
            const stepDirs = readdirSync(artifactsDir).filter(d => {
                const fullPath = join(artifactsDir, d);
                return statSync(fullPath).isDirectory() && d !== 'export';
            });

            for (const stepDir of stepDirs) {
                const stepPath = join(artifactsDir, stepDir);
                const files = readdirSync(stepPath);

                for (const file of files) {
                    const filePath = join(stepPath, file);
                    const stats = statSync(filePath);

                    if (stats.isFile()) {
                        artifacts.push({
                            stepKey: stepDir,
                            filename: file,
                            path: filePath,
                            sizeBytes: stats.size,
                            type: getFileType(file),
                        });
                        totalSize += stats.size;
                    }
                }
            }
        }

        // Encontrar vídeo para thumbnail
        const videoArtifact = artifacts.find(a => a.type === 'video/mp4');
        let thumbnailPath: string | undefined;

        if (videoArtifact) {
            const thumbPath = join(exportDir, 'thumbnail.jpg');
            const thumbResult = await extractThumbnail(videoArtifact.path, thumbPath);
            if (thumbResult.success) {
                thumbnailPath = thumbResult.thumbnailPath;
            }
        }

        // Criar manifest de export
        const exportManifest = {
            job_id: jobId,
            exported_at: new Date().toISOString(),
            artifacts: artifacts.map(a => ({
                step: a.stepKey,
                file: a.filename,
                type: a.type,
                size_bytes: a.sizeBytes,
            })),
            totals: {
                artifacts_count: artifacts.length,
                total_size_bytes: totalSize,
            },
            thumbnail: thumbnailPath ? basename(thumbnailPath) : null,
            original_manifest: manifest,
        };

        const manifestPath = join(exportDir, 'manifest.json');
        writeFileSync(manifestPath, JSON.stringify(exportManifest, null, 2));

        // Copiar artifacts principais para export
        const mainArtifacts = ['video.mp4', 'audio.mp3'];
        for (const artifact of artifacts) {
            if (mainArtifacts.includes(artifact.filename)) {
                const destPath = join(exportDir, `${artifact.stepKey}_${artifact.filename}`);
                copyFileSync(artifact.path, destPath);
            }
        }

        return {
            success: true,
            exportPath: exportDir,
            thumbnailPath,
            manifestPath,
            totalSizeBytes: totalSize,
        };

    } catch (error) {
        return {
            success: false,
            error: {
                code: 'EXPORT_ERROR',
                message: error instanceof Error ? error.message : 'Erro desconhecido no export',
            },
        };
    }
}

/**
 * Retorna MIME type baseado na extensão
 */
function getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'txt': 'text/plain',
        'json': 'application/json',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
}
