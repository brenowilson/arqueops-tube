/**

/**
 * Scene Prompts Executor
 * 
 * Divide o roteiro em cenas e gera prompts de imagem para cada cena.
 * Baseado no fluxo do Video Save Guardian (scene-prompts-start).
 */

import { getStepKind } from "../capabilities";
import { executeLLM, ensureArtifactDir } from "../providers";
import { loadPrompt, loadProvider, loadKnowledgeBase } from "../loaders";
import { StepDefinition, ResolvedConfig, LogEntry, StepManifest } from "../types";

// ======================
// TYPES
// ======================

export interface SceneData {
    scene_number: number;
    main_text: string;
    context_before: string;
    context_after: string;
    timing: {
        start: string;
        end: string;
        duration_seconds: number;
    };
    position: 'opening' | 'development' | 'climax' | 'resolution';
    is_wildcard_scene: boolean;
    image_prompt?: string; // Preenchido pela IA
}

export interface ScenePromptsConfig {
    generation_mode: '7x1' | 'by-words' | 'by-seconds' | 'by-paragraphs' | 'automatic';
    words_per_scene: number;
    seconds_per_scene: number;
    wpm_rate: number;
    image_style: string;
    platform: 'imagefx' | 'midjourney' | 'dall-e';
    language: 'pt' | 'en';
    characters_description?: string;
}

// ======================
// SCENE SPLITTING LOGIC
// (Ported from Guardian's scene-prompts-start)
// ======================

const DEFAULT_WPM = 130;

function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculateContextSize(sceneWordCount: number): number {
    const proportional = Math.floor(sceneWordCount * 0.25);
    return Math.min(300, Math.max(50, proportional));
}

function getPosition(index: number, total: number): 'opening' | 'development' | 'climax' | 'resolution' {
    const progress = index / total;
    if (progress < 0.15) return 'opening';
    if (progress < 0.7) return 'development';
    if (progress < 0.85) return 'climax';
    return 'resolution';
}

export function splitScriptIntoScenes(
    content: string,
    config: ScenePromptsConfig
): SceneData[] {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    const { generation_mode, words_per_scene, seconds_per_scene, wpm_rate } = config;

    const sceneRanges: Array<{ start: number; end: number }> = [];

    // MODO 7x1: 6 cenas nos primeiros 4 min + 1 imagem final
    if (generation_mode === '7x1') {
        const wordsPerHookScene = 87; // 40 segundos a ~130 WPM
        const totalHookWords = wordsPerHookScene * 6;

        for (let i = 0; i < 6; i++) {
            const start = i * wordsPerHookScene;
            const end = Math.min(start + wordsPerHookScene, totalWords);
            if (start < totalWords) {
                sceneRanges.push({ start, end });
            }
        }

        if (totalHookWords < totalWords) {
            sceneRanges.push({ start: totalHookWords, end: totalWords });
        }
    } else if (generation_mode === 'by-paragraphs') {
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20);
        let wordIndex = 0;

        for (const para of paragraphs) {
            const paraWords = para.split(/\s+/).filter(w => w.length > 0);
            sceneRanges.push({
                start: wordIndex,
                end: Math.min(wordIndex + paraWords.length, totalWords)
            });
            wordIndex += paraWords.length;
        }
    } else if (generation_mode === 'by-words') {
        for (let i = 0; i < totalWords; i += words_per_scene) {
            sceneRanges.push({
                start: i,
                end: Math.min(i + words_per_scene, totalWords)
            });
        }
    } else if (generation_mode === 'by-seconds') {
        const wordsPerSecond = wpm_rate / 60;
        const wordsForDuration = Math.round(seconds_per_scene * wordsPerSecond);

        for (let i = 0; i < totalWords; i += wordsForDuration) {
            sceneRanges.push({
                start: i,
                end: Math.min(i + wordsForDuration, totalWords)
            });
        }
    } else {
        // Modo automático - ~80 palavras (~37s)
        const autoWordsPerScene = 80;
        for (let i = 0; i < totalWords; i += autoWordsPerScene) {
            sceneRanges.push({
                start: i,
                end: Math.min(i + autoWordsPerScene, totalWords)
            });
        }
    }

    // Criar SceneData com contexto
    const scenes: SceneData[] = [];
    const totalScenes = sceneRanges.length;
    const wordsPerSecondCalc = wpm_rate / 60;

    for (let i = 0; i < sceneRanges.length; i++) {
        const range = sceneRanges[i];
        const sceneWordCount = range.end - range.start;
        const contextSize = calculateContextSize(sceneWordCount);

        const mainText = words.slice(range.start, range.end).join(' ');

        const contextBeforeStart = Math.max(0, range.start - contextSize);
        const contextBefore = words.slice(contextBeforeStart, range.start).join(' ');

        const contextAfterEnd = Math.min(totalWords, range.end + contextSize);
        const contextAfter = words.slice(range.end, contextAfterEnd).join(' ');

        const startSeconds = range.start / wordsPerSecondCalc;
        const endSeconds = range.end / wordsPerSecondCalc;
        const durationSeconds = endSeconds - startSeconds;

        const isWildcard = generation_mode === '7x1' && i === 6;
        const position = getPosition(i, totalScenes);

        scenes.push({
            scene_number: i + 1,
            main_text: mainText,
            context_before: contextBefore,
            context_after: contextAfter,
            timing: {
                start: formatTime(startSeconds),
                end: formatTime(endSeconds),
                duration_seconds: Math.round(durationSeconds),
            },
            is_wildcard_scene: isWildcard,
            position,
        });
    }

    return scenes;
}

// ======================
// IMAGE PROMPT GENERATION
// ======================

function buildImagePromptRequest(scene: SceneData, config: ScenePromptsConfig): string {
    const { image_style, platform, language, characters_description } = config;

    return `Gere um prompt de imagem para a seguinte cena de um vídeo narrado.

## Contexto da Cena ${scene.scene_number}
- **Posição narrativa:** ${scene.position}
- **Duração:** ${scene.timing.duration_seconds}s (${scene.timing.start} - ${scene.timing.end})
${scene.is_wildcard_scene ? '- **Nota:** Esta é uma cena curinga que representa o resto do vídeo' : ''}

## Texto da Cena
${scene.main_text}

${scene.context_before ? `## Contexto Anterior\n${scene.context_before}` : ''}

${scene.context_after ? `## Contexto Posterior\n${scene.context_after}` : ''}

${characters_description ? `## Descrição dos Personagens\n${characters_description}` : ''}

## Requisitos do Prompt
- Estilo visual: ${image_style}
- Plataforma: ${platform}
- Idioma do prompt: ${language === 'pt' ? 'Português' : 'Inglês'}
- Foco em: ambiente, personagens, emoção dominante, composição
- Incluir sugestão de ângulo de câmera
- Máximo 150 palavras

Retorne APENAS o prompt de imagem, sem explicações.`;
}

// ======================
// EXECUTOR
// ======================

export async function executeStepScenePrompts(
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
        message: `Step Scene Prompts: ${stepDef.name}`,
        stepKey: stepDef.key,
    });

    // Get script content from previous outputs
    let scriptContent = "";
    const scriptOutput = previousOutputs.roteiro || previousOutputs.script;

    if (typeof scriptOutput === "string") {
        scriptContent = scriptOutput;
    } else if (scriptOutput && typeof scriptOutput === "object" && "output" in scriptOutput) {
        scriptContent = String((scriptOutput as Record<string, unknown>).output || "");
    }

    if (!scriptContent) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = { code: "NO_SCRIPT", message: "Roteiro não encontrado nos outputs anteriores" };
        logs.push({ timestamp: now(), level: "error", message: "Roteiro não encontrado", stepKey: stepDef.key });
        return stepManifest;
    }

    // Config from input or defaults
    const sceneConfig: ScenePromptsConfig = {
        generation_mode: (input.generation_mode as ScenePromptsConfig['generation_mode']) || '7x1',
        words_per_scene: Number(input.words_per_scene) || 100,
        seconds_per_scene: Number(input.seconds_per_scene) || 10,
        wpm_rate: Number(input.wpm_rate) || DEFAULT_WPM,
        image_style: String(input.image_style || 'cinematografico'),
        platform: (input.platform as ScenePromptsConfig['platform']) || 'imagefx',
        language: (input.language as 'pt' | 'en') || 'pt',
        characters_description: input.characters_description as string | undefined,
    };

    logs.push({
        timestamp: now(),
        level: "info",
        message: `Dividindo roteiro: mode=${sceneConfig.generation_mode}, wpm=${sceneConfig.wpm_rate}`,
        stepKey: stepDef.key,
    });

    // Split script into scenes
    const scenes = splitScriptIntoScenes(scriptContent, sceneConfig);

    logs.push({
        timestamp: now(),
        level: "info",
        message: `${scenes.length} cenas identificadas`,
        stepKey: stepDef.key,
    });

    // Load prompt and provider for image prompt generation
    if (!stepConfig.prompt?.id) {
        // If no prompt configured, just return scenes without image prompts
        logs.push({
            timestamp: now(),
            level: "warn",
            message: "Nenhum prompt configurado - retornando cenas sem prompts de imagem",
            stepKey: stepDef.key,
        });

        const artifactDir = await ensureArtifactDir(jobId, stepDef.key);
        const fs = await import("fs/promises");
        const outputPath = `${artifactDir}/scenes.json`;
        await fs.writeFile(outputPath, JSON.stringify(scenes, null, 2));

        stepManifest.artifacts = [{
            uri: outputPath,
            content_type: "application/json",
            size_bytes: JSON.stringify(scenes).length,
        }];

        stepManifest.status = "success";
        stepManifest.completed_at = now();
        stepManifest.response = { output: { scenes, config: sceneConfig } };
        return stepManifest;
    }

    // Generate image prompts for each scene using LLM
    const prompt = await loadPrompt(stepConfig.prompt.id);
    const provider = stepConfig.provider?.id ? await loadProvider(stepConfig.provider.id) : null;

    if (!prompt || !provider) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = { code: "MISSING_CONFIG", message: "Prompt ou provider não encontrado" };
        return stepManifest;
    }

    const kbIds = stepConfig.kb?.items?.map(k => k.id) || [];
    const kbContext = await loadKnowledgeBase(kbIds);

    logs.push({
        timestamp: now(),
        level: "info",
        message: `Gerando prompts de imagem para ${scenes.length} cenas com Claude`,
        stepKey: stepDef.key,
    });

    // Generate prompts for each scene
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const userPrompt = buildImagePromptRequest(scene, sceneConfig);

        const llmResult = await executeLLM({
            provider,
            prompt: {
                ...prompt,
                userTemplate: userPrompt, // Override with scene-specific prompt
            },
            variables: {},
            kbContext: kbContext || undefined,
        });

        if (llmResult.success && llmResult.output) {
            scene.image_prompt = llmResult.output.trim();
            logs.push({
                timestamp: now(),
                level: "info",
                message: `Cena ${scene.scene_number}/${scenes.length}: prompt gerado`,
                stepKey: stepDef.key,
            });
        } else {
            logs.push({
                timestamp: now(),
                level: "warn",
                message: `Cena ${scene.scene_number}: falha ao gerar prompt - ${llmResult.error?.message}`,
                stepKey: stepDef.key,
            });
        }
    }

    // Save scenes as artifact
    const artifactDir = await ensureArtifactDir(jobId, stepDef.key);
    const fs = await import("fs/promises");
    const outputPath = `${artifactDir}/scenes.json`;
    await fs.writeFile(outputPath, JSON.stringify(scenes, null, 2));

    stepManifest.artifacts = [{
        uri: outputPath,
        content_type: "application/json",
        size_bytes: JSON.stringify(scenes).length,
    }];

    stepManifest.status = "success";
    stepManifest.completed_at = now();
    stepManifest.duration_ms = Date.now() - new Date(startedAt).getTime();
    stepManifest.response = {
        output: {
            scenes,
            config: sceneConfig,
            scenes_count: scenes.length,
            prompts_generated: scenes.filter(s => s.image_prompt).length,
        },
    };

    logs.push({
        timestamp: now(),
        level: "info",
        message: `${scenes.filter(s => s.image_prompt).length}/${scenes.length} prompts gerados com sucesso`,
        stepKey: stepDef.key,
    });

    return stepManifest;
}
