/**

/**
 * Generate Images Executor
 * 
 * Gera imagens para cada cena usando o ImageFX adapter.
 * Lê os prompts de scene-prompts e gera imagens correspondentes.
 */

import { getStepKind } from "../capabilities";
import { ensureArtifactDir } from "../providers";
import { StepDefinition, ResolvedConfig, LogEntry, StepManifest } from "../types";
import { generateImageFX, getCookiesFromEnv, type ImageFXConfig } from "@/lib/adapters/imagefx";
import { SceneData } from "./scene-prompts";
import fs from "fs/promises";
import path from "path";

// ======================
// TYPES
// ======================

export interface GeneratedImage {
    scene_number: number;
    prompt: string;
    image_path: string;
    timing: {
        start: string;
        end: string;
        duration_seconds: number;
    };
    success: boolean;
    error?: string;
}

// ======================
// EXECUTOR
// ======================

export async function executeStepGenerateImages(
    stepDef: StepDefinition,
    stepConfig: ResolvedConfig,
    input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind = stepDef.kind || getStepKind(stepDef.key);

    const stepManifest: StepManifest = {
        key: stepDef.key,
        kind,
        status: "running",
        config: stepConfig,
        started_at: startedAt,
    };

    logs.push({
        timestamp: now(),
        level: "info",
        message: `Step Generate Images: ${stepDef.name}`,
        stepKey: stepDef.key,
    });

    // Get scenes from previous step output
    let scenes: SceneData[] = [];
    const scenesOutput = previousOutputs.prompts_cenas || previousOutputs.scene_prompts;

    if (scenesOutput && typeof scenesOutput === "object") {
        const output = scenesOutput as { scenes?: SceneData[]; output?: { scenes?: SceneData[] } };
        scenes = output.scenes || output.output?.scenes || [];
    }

    if (scenes.length === 0) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = { code: "NO_SCENES", message: "Nenhuma cena encontrada nos outputs anteriores" };
        logs.push({ timestamp: now(), level: "error", message: "Cenas não encontradas", stepKey: stepDef.key });
        return stepManifest;
    }

    // Get ImageFX cookies from input or env
    const cookies = (input.imagefx_cookies as string) || getCookiesFromEnv();

    if (!cookies) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = {
            code: "NO_COOKIES",
            message: "Cookies do ImageFX não configurados. Defina IMAGEFX_COOKIES no .env.local ou passe via input."
        };
        logs.push({ timestamp: now(), level: "error", message: "Cookies do ImageFX não encontrados", stepKey: stepDef.key });
        return stepManifest;
    }

    // Config
    const imagefxConfig: ImageFXConfig = {
        cookies,
        aspect_ratio: (input.aspect_ratio as 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE') || 'LANDSCAPE',
        num_images: 1,
    };

    // Setup images directory
    const artifactDir = await ensureArtifactDir(jobId, stepDef.key);
    const imagesDir = path.join(artifactDir, "images");
    await fs.mkdir(imagesDir, { recursive: true });

    logs.push({
        timestamp: now(),
        level: "info",
        message: `Gerando ${scenes.length} imagens com ImageFX`,
        stepKey: stepDef.key,
    });

    const generatedImages: GeneratedImage[] = [];
    const delayBetweenRequests = 3000; // 3 seconds to avoid rate limiting

    // Generate images for each scene
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        if (!scene.image_prompt) {
            logs.push({
                timestamp: now(),
                level: "warn",
                message: `Cena ${scene.scene_number}: sem prompt de imagem, pulando`,
                stepKey: stepDef.key,
            });
            generatedImages.push({
                scene_number: scene.scene_number,
                prompt: "",
                image_path: "",
                timing: scene.timing,
                success: false,
                error: "No image prompt available",
            });
            continue;
        }

        logs.push({
            timestamp: now(),
            level: "info",
            message: `Gerando imagem ${i + 1}/${scenes.length} - Cena ${scene.scene_number}`,
            stepKey: stepDef.key,
        });

        const result = await generateImageFX(scene.image_prompt, imagefxConfig);

        if (result.success && result.images && result.images.length > 0) {
            const imagePath = path.join(imagesDir, `scene-${scene.scene_number.toString().padStart(2, '0')}.png`);
            await fs.writeFile(imagePath, result.images[0]);

            generatedImages.push({
                scene_number: scene.scene_number,
                prompt: scene.image_prompt,
                image_path: imagePath,
                timing: scene.timing,
                success: true,
            });

            logs.push({
                timestamp: now(),
                level: "info",
                message: `Cena ${scene.scene_number}: imagem salva em ${imagePath}`,
                stepKey: stepDef.key,
            });
        } else {
            generatedImages.push({
                scene_number: scene.scene_number,
                prompt: scene.image_prompt,
                image_path: "",
                timing: scene.timing,
                success: false,
                error: result.error,
            });

            logs.push({
                timestamp: now(),
                level: "warn",
                message: `Cena ${scene.scene_number}: falha na geração - ${result.error}`,
                stepKey: stepDef.key,
            });
        }

        // Delay between requests (except for last one)
        if (i < scenes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
    }

    // Save manifest
    const manifestPath = path.join(artifactDir, "generated-images.json");
    await fs.writeFile(manifestPath, JSON.stringify(generatedImages, null, 2));

    // Calculate stats
    const successCount = generatedImages.filter(img => img.success).length;
    const failCount = generatedImages.filter(img => !img.success).length;

    stepManifest.artifacts = [
        {
            uri: manifestPath,
            content_type: "application/json",
            size_bytes: JSON.stringify(generatedImages).length,
        },
        ...generatedImages
            .filter(img => img.success && img.image_path)
            .map(img => ({
                uri: img.image_path,
                content_type: "image/png",
            })),
    ];

    stepManifest.status = failCount === scenes.length ? "failed" : "success";
    stepManifest.completed_at = now();
    stepManifest.duration_ms = Date.now() - new Date(startedAt).getTime();
    stepManifest.response = {
        output: {
            images: generatedImages,
            total: scenes.length,
            success_count: successCount,
            fail_count: failCount,
            images_dir: imagesDir,
        },
    };

    logs.push({
        timestamp: now(),
        level: "info",
        message: `Geração concluída: ${successCount}/${scenes.length} imagens geradas`,
        stepKey: stepDef.key,
    });

    return stepManifest;
}
