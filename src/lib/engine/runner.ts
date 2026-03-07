/**
 * DarkFlow Pipeline Runner - Full manifest-first execution engine
 * Ported from Video Factory OS (riccodecarvalho/video-factory-os)
 *
 * Adaptations:
 * - Supabase instead of Drizzle/SQLite
 * - Claude CLI (`claude -p`) instead of Anthropic API for LLM steps
 * - Azure Batch TTS (same as original)
 */

import { spawn } from "child_process";
import { createServiceClient } from "@/lib/supabase/server";
import { getStepKind } from "./capabilities";
import { getPreviousOutputKey } from "./step-mapper";
import {
    loadPrompt, loadProvider, loadVoicePreset, loadSsmlPreset,
    loadVideoPreset, loadValidators, loadKnowledgeBase,
} from "./loaders";
import {
    executeValidators, ensureArtifactDir, getArtifactPath,
    executeTTS as executeTTSProvider,
} from "./providers";
import type { StepManifest, LogEntry, ResolvedConfig } from "./types";
import type { StepKind } from "./capabilities";

// ============================================
// TYPES
// ============================================

type JobState =
    | "DRAFT" | "READY" | "SCRIPTING" | "SCRIPT_DONE"
    | "TTS_RUNNING" | "TTS_DONE" | "RENDER_READY" | "RENDER_RUNNING"
    | "DONE" | "FAILED" | "CANCELLED";

interface PipelineStep {
    key: string;
    label: string;
    type: string;
}

interface Manifest {
    version: string;
    job_id: string;
    recipe_key: string;
    language: string;
    created_at: string;
    updated_at: string;
    steps: StepManifest[];
    artifacts: Array<{ step_key: string; uri: string; content_type: string }>;
    snapshots: { config_by_step: Record<string, ResolvedConfig> };
    metrics: { llm_tokens_used: number; total_duration_ms: number; step_count: number };
}

const STEP_TO_STATE: Record<string, { running: JobState; done: JobState }> = {
    ideacao: { running: "SCRIPTING", done: "SCRIPTING" },
    titulo: { running: "SCRIPTING", done: "SCRIPTING" },
    brief: { running: "SCRIPTING", done: "SCRIPTING" },
    planejamento: { running: "SCRIPTING", done: "SCRIPTING" },
    roteiro: { running: "SCRIPTING", done: "SCRIPT_DONE" },
    prompts_cenas: { running: "SCRIPT_DONE", done: "SCRIPT_DONE" },
    gerar_imagens: { running: "SCRIPT_DONE", done: "SCRIPT_DONE" },
    parse_ssml: { running: "TTS_RUNNING", done: "TTS_RUNNING" },
    tts: { running: "TTS_RUNNING", done: "TTS_DONE" },
    render: { running: "RENDER_RUNNING", done: "RENDER_RUNNING" },
    miniaturas: { running: "RENDER_RUNNING", done: "RENDER_RUNNING" },
    export: { running: "RENDER_RUNNING", done: "DONE" },
};

// ============================================
// CLAUDE CLI EXECUTOR
// ============================================

const CLAUDE_CLI = process.env.CLAUDE_CLI_PATH ?? "claude";

async function callClaude(
    systemPrompt: string,
    userPrompt: string,
    model = "claude-sonnet-4-6",
    maxTokens = 8192,
): Promise<{
    success: boolean;
    output?: string;
    usage?: { inputTokens: number; outputTokens: number };
    model: string;
    duration_ms: number;
    error?: { code: string; message: string };
}> {
    const start = Date.now();
    const fullPrompt = `<system>\n${systemPrompt}\n</system>\n\n${userPrompt}`;

    return new Promise((resolve) => {
        const args = [
            "-p", fullPrompt,
            "--output-format", "json",
            "--max-turns", "1",
            "--model", model,
        ];

        const env = { ...process.env, CLAUDECODE: "" };

        const proc = spawn(CLAUDE_CLI, args, {
            cwd: process.cwd(),
            env,
            stdio: ["pipe", "pipe", "pipe"],
        });
        proc.stdin.end();

        let stdout = "";
        let stderr = "";

        const timer = setTimeout(() => {
            proc.kill("SIGKILL");
            resolve({
                success: false, model, duration_ms: Date.now() - start,
                error: { code: "TIMEOUT", message: "Claude CLI timeout (5 min)" },
            });
        }, 300_000);

        proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
        proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

        proc.on("close", (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                resolve({
                    success: false, model, duration_ms: Date.now() - start,
                    error: { code: `EXIT_${code}`, message: stderr.slice(0, 500) },
                });
                return;
            }

            try {
                const parsed = JSON.parse(stdout);
                const text = parsed.result ?? parsed.content ?? stdout;
                resolve({
                    success: true, model, duration_ms: Date.now() - start,
                    output: typeof text === "string" ? text : JSON.stringify(text),
                    usage: {
                        inputTokens: parsed.usage?.input_tokens ?? 0,
                        outputTokens: parsed.usage?.output_tokens ?? 0,
                    },
                });
            } catch {
                resolve({
                    success: true, model, duration_ms: Date.now() - start,
                    output: stdout.trim(),
                    usage: { inputTokens: 0, outputTokens: 0 },
                });
            }
        });

        proc.on("error", (err) => {
            clearTimeout(timer);
            resolve({
                success: false, model, duration_ms: Date.now() - start,
                error: { code: "SPAWN_ERROR", message: err.message },
            });
        });
    });
}

// ============================================
// CONFIG RESOLVER (inline — avoids 'use server' import issues)
// ============================================

async function resolveStepConfig(recipeKey: string, stepKey: string): Promise<ResolvedConfig> {
    const supabase = createServiceClient();

    // Load binding for this recipe + step (unique constraint: recipe_key + step_key)
    const { data: binding } = await supabase
        .from("execution_bindings")
        .select("*")
        .eq("recipe_key", recipeKey)
        .eq("step_key", stepKey)
        .single();

    if (!binding) return {};

    const config: ResolvedConfig = {};

    // Resolve prompt by key
    if (binding.prompt_key) {
        const { data: prompt } = await supabase
            .from("prompts").select("id, name").eq("key", binding.prompt_key).single();
        if (prompt) config.prompt = { id: prompt.id, name: prompt.name, source: "global" };
    }

    // Resolve provider by key
    if (binding.provider_key) {
        const { data: provider } = await supabase
            .from("providers").select("id, name").eq("key", binding.provider_key).single();
        if (provider) config.provider = { id: provider.id, name: provider.name, source: "global" };
    }

    // Resolve preset (voice, video, or ssml — determined by step type)
    if (binding.preset_key) {
        // Try voice first, then ssml, then video
        const { data: voice } = await supabase
            .from("presets_voice").select("id, name").eq("key", binding.preset_key).single();
        if (voice) {
            config.preset_voice = { id: voice.id, name: voice.name, source: "global" };
        } else {
            const { data: ssml } = await supabase
                .from("presets_ssml").select("id, name").eq("key", binding.preset_key).single();
            if (ssml) {
                config.preset_ssml = { id: ssml.id, name: ssml.name, source: "global" };
            } else {
                const { data: video } = await supabase
                    .from("presets_video").select("id, name").eq("key", binding.preset_key).single();
                if (video) config.preset_video = { id: video.id, name: video.name, source: "global" };
            }
        }
    }

    // Resolve validators from validator_keys JSONB array
    const validatorKeys: string[] = Array.isArray(binding.validator_keys) ? binding.validator_keys : [];
    if (validatorKeys.length > 0) {
        const items = [];
        for (const key of validatorKeys) {
            const { data: v } = await supabase.from("validators").select("id, name").eq("key", key).single();
            if (v) items.push({ id: v.id, name: v.name });
        }
        if (items.length) config.validators = { items, source: "global" };
    }

    // Resolve KB from kb_keys JSONB { "tier2": [...], "tier3": [...] }
    const kbKeys = binding.kb_keys || {};
    const allKbKeys: string[] = [
        ...(Array.isArray(kbKeys.tier2) ? kbKeys.tier2 : []),
        ...(Array.isArray(kbKeys.tier3) ? kbKeys.tier3 : []),
    ];
    if (allKbKeys.length > 0) {
        const items = [];
        for (const key of allKbKeys) {
            const { data: kb } = await supabase.from("knowledge_base").select("id, title").eq("key", key).single();
            if (kb) items.push({ id: kb.id, name: kb.title });
        }
        if (items.length) config.kb = { items, source: "global" };
    }

    return config;
}

// ============================================
// MANIFEST HELPERS
// ============================================

function createInitialManifest(jobId: string, recipeKey: string, language: string): Manifest {
    const now = new Date().toISOString();
    return {
        version: "3.0.0",
        job_id: jobId,
        recipe_key: recipeKey,
        language,
        created_at: now,
        updated_at: now,
        steps: [],
        artifacts: [],
        snapshots: { config_by_step: {} },
        metrics: { llm_tokens_used: 0, total_duration_ms: 0, step_count: 0 },
    };
}

function generateInputHash(input: Record<string, unknown>): string {
    const str = JSON.stringify(input, Object.keys(input).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
}

// ============================================
// DEFAULT PROMPTS (fallbacks when no binding configured)
// ============================================

function getDefaultSystemPrompt(stepKey: string, language: string): string {
    const lang = language === "pt-BR" ? "português brasileiro" : language === "es-ES" ? "español" : "English";

    const prompts: Record<string, string> = {
        ideacao: `Você é um criador de conteúdo para YouTube especializado em gerar conceitos virais.
Gere um conceito criativo e envolvente para um vídeo em ${lang}.
Retorne: título provisório, gancho emocional, público-alvo, ângulo único.`,

        titulo: `Você é um especialista em títulos para YouTube que maximizam CTR.
Gere 5 opções de título em ${lang}. Cada título deve ter:
- Menos de 60 caracteres
- Gancho emocional ou curiosidade
- Palavra-chave relevante
Retorne os 5 títulos numerados, e indique qual é o melhor com [MELHOR].`,

        brief: `Você é um roteirista de vídeos para YouTube.
Expanda o conceito em um brief detalhado em ${lang}. Inclua:
- Protagonistas/vozes
- Conflito ou tensão central
- Emoção predominante
- 3 pontos-chave do vídeo
- Tom e estilo`,

        planejamento: `Você é um arquiteto narrativo de vídeos para YouTube.
Crie a estrutura narrativa completa em ${lang}. Inclua:
- Hook (primeiros 30 segundos)
- Plot points (3-5)
- Clímax
- Resolução
- Call to action
- Pacing (ritmo por seção)
Formato: lista estruturada com timestamps aproximados.`,

        roteiro: `Você é um roteirista profissional de vídeos narrados para YouTube.
Escreva o roteiro completo em ${lang} com pelo menos 1500 palavras.

FORMATO OBRIGATÓRIO:
- Comece com: (voz: NARRADOR)
- Use marcadores de voz: NARRADOR, ESPECIALISTA, OUTRO
- Use pausas: [PAUSA CURTA], [PAUSA], [PAUSA LONGA]
- NÃO use SSML, Markdown, ou tags HTML
- Escreva em formato "stage directions" (direções de cena)

O roteiro deve ser envolvente, com ritmo variado, e manter o espectador até o final.`,

        prompts_cenas: `Você é um diretor visual de vídeos para YouTube.
Analise o roteiro e gere prompts de imagem para cada cena.

Para cada cena, gere:
- Número da cena
- Descrição visual detalhada (para gerador de imagens AI)
- Estilo visual (cinematográfico, ilustração, etc.)
- Mood/atmosfera

Formato: JSON array com objetos { scene: number, prompt: string, style: string, mood: string }`,

        miniaturas: `Você é um designer de thumbnails para YouTube.
Gere 3 descrições detalhadas de miniaturas para este vídeo.

Cada descrição deve incluir:
- Texto overlay (máximo 4 palavras, em ${lang})
- Descrição da imagem de fundo
- Cores dominantes
- Expressão facial (se aplicável)
- Composição`,
    };

    return prompts[stepKey] || `Você é um assistente criativo de produção de vídeos. Execute a etapa "${stepKey}" em ${lang}.`;
}

function getDefaultUserPrompt(stepKey: string): string {
    const prompts: Record<string, string> = {
        ideacao: "Tópico: {{topic}}\n\nGere o conceito do vídeo.",
        titulo: "Conceito:\n{{ideacao}}\n\nGere 5 opções de título.",
        brief: "Título: {{titulo}}\nConceito: {{ideacao}}\n\nExpanda em um brief detalhado.",
        planejamento: "Brief:\n{{brief}}\n\nCrie a estrutura narrativa.",
        roteiro: "Planejamento:\n{{planejamento}}\n\nBrief:\n{{brief}}\n\nEscreva o roteiro completo.",
        prompts_cenas: "Roteiro:\n{{roteiro}}\n\nGere os prompts visuais para cada cena.",
        miniaturas: "Título: {{titulo}}\nConceito: {{ideacao}}\nRoteiro (resumo):\n{{roteiro}}\n\nGere 3 descrições de thumbnail.",
    };

    return prompts[stepKey] || "Entrada: {{topic}}\n\nExecute esta etapa.";
}

function substituteVariables(template: string, variables: Record<string, unknown>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), String(value ?? ""));
    }
    return result;
}

// ============================================
// STEP EXECUTORS
// ============================================

async function executeStepLLM(
    stepKey: string,
    stepName: string,
    stepConfig: ResolvedConfig,
    input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string,
    language: string,
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind: StepKind = getStepKind(stepKey);

    const stepManifest: StepManifest = {
        key: stepKey, kind, status: "running",
        config: stepConfig, started_at: startedAt,
    };

    logs.push({
        timestamp: now(), level: "info",
        message: `Step LLM: ${stepName}`, stepKey,
        meta: { prompt_id: stepConfig.prompt?.id, provider_id: stepConfig.provider?.id },
    });

    // Load prompt (from binding or fallback)
    let systemPrompt = "";
    let userTemplate = "";
    let model = "claude-sonnet-4-6";
    let maxTokens = 8192;

    if (stepConfig.prompt?.id) {
        const prompt = await loadPrompt(stepConfig.prompt.id);
        if (prompt) {
            systemPrompt = prompt.systemPrompt;
            userTemplate = prompt.userTemplate;
            model = prompt.model || model;
            maxTokens = prompt.maxTokens || maxTokens;

            stepManifest.request = {
                prompt_id: prompt.id,
                prompt_version: prompt.version,
                provider_id: stepConfig.provider?.id,
                model,
                max_tokens: maxTokens,
                temperature: prompt.temperature,
            };
        }
    }

    // Fallback to defaults if no prompt configured
    if (!systemPrompt) {
        systemPrompt = getDefaultSystemPrompt(stepKey, language);
        logs.push({ timestamp: now(), level: "info", message: "Usando prompt padrão (sem binding)", stepKey });
    }
    if (!userTemplate) {
        userTemplate = getDefaultUserPrompt(stepKey);
    }

    // Load KB context
    const kbIds = stepConfig.kb?.items?.map((k) => k.id) || [];
    const kbContext = await loadKnowledgeBase(kbIds);

    // Also load Tier 1 KB (always injected)
    const supabase = createServiceClient();
    const { data: tier1 } = await supabase
        .from("knowledge_base")
        .select("content")
        .eq("tier", 1)
        .eq("is_active", true);

    let fullKbContext = kbContext;
    if (tier1?.length) {
        fullKbContext += (fullKbContext ? "\n\n---\n\n" : "") + tier1.map((k) => k.content).join("\n\n");
    }

    if (fullKbContext) {
        systemPrompt += `\n\n<knowledge_base>\n${fullKbContext}\n</knowledge_base>`;
    }

    // Load validators
    const validatorIds = stepConfig.validators?.items?.map((v) => v.id) || [];
    const validators = await loadValidators(validatorIds);

    // Build variables: flatten previousOutputs + aliases + input
    const flattenedOutputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(previousOutputs)) {
        if (typeof value === "string") {
            flattenedOutputs[key] = value;
        } else if (value && typeof value === "object" && "output" in value) {
            flattenedOutputs[key] = (value as { output: unknown }).output;
        } else if (value && typeof value === "object") {
            const obj = value as Record<string, unknown>;
            flattenedOutputs[key] = obj.output || obj.text || obj.script || obj.ssml || JSON.stringify(value);
        }
    }

    const inputAliases: Record<string, unknown> = {
        titulo: input.titulo || input.title,
        idea: input.idea || input.brief,
        duracao: input.duracao || input.duration || "40",
    };

    const variables: Record<string, unknown> = {
        ...inputAliases,
        ...flattenedOutputs,
        ...input,
    };

    // Render user prompt with variables
    const userMessage = substituteVariables(userTemplate, variables);

    logs.push({
        timestamp: now(), level: "info",
        message: `Chamando Claude CLI: model=${model}`, stepKey,
    });

    // Execute LLM via Claude CLI
    const llmResult = await callClaude(systemPrompt, userMessage, model, maxTokens);

    if (!llmResult.success) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.duration_ms = llmResult.duration_ms;
        stepManifest.error = {
            code: llmResult.error?.code || "LLM_FAILED",
            message: llmResult.error?.message || "Claude CLI falhou",
        };
        logs.push({ timestamp: now(), level: "error", message: `LLM falhou: ${llmResult.error?.message}`, stepKey });
        return stepManifest;
    }

    logs.push({
        timestamp: now(), level: "info",
        message: `Claude respondeu: ${llmResult.usage?.outputTokens} tokens em ${llmResult.duration_ms}ms`,
        stepKey,
    });

    // Run validators
    if (validators.length > 0 && llmResult.output) {
        const validationResults = executeValidators(llmResult.output, validators);
        stepManifest.validations = validationResults;

        const failed = validationResults.filter((v) => !v.passed);
        if (failed.length > 0) {
            stepManifest.status = "failed";
            stepManifest.completed_at = now();
            stepManifest.duration_ms = llmResult.duration_ms;
            stepManifest.error = {
                code: "VALIDATION_FAILED",
                message: failed[0].errorMessage || "Validação falhou",
            };
            logs.push({ timestamp: now(), level: "error", message: `Validação falhou: ${failed[0].errorMessage}`, stepKey });
            return stepManifest;
        }

        logs.push({ timestamp: now(), level: "info", message: `${validators.length} validadores passaram`, stepKey });
    }

    // Save artifact
    const artifactDir = await ensureArtifactDir(jobId, stepKey);
    const fs = await import("fs/promises");
    const outputPath = `${artifactDir}/output.txt`;
    await fs.writeFile(outputPath, llmResult.output || "");

    stepManifest.artifacts = [{
        uri: outputPath, content_type: "text/plain",
        size_bytes: (llmResult.output || "").length,
    }];

    stepManifest.status = "success";
    stepManifest.completed_at = now();
    stepManifest.duration_ms = llmResult.duration_ms;
    stepManifest.response = { output: llmResult.output, usage: llmResult.usage };

    return stepManifest;
}

async function executeStepTTS(
    stepKey: string,
    stepName: string,
    stepConfig: ResolvedConfig,
    input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string,
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind: StepKind = getStepKind(stepKey);

    const stepManifest: StepManifest = {
        key: stepKey, kind, status: "running", config: stepConfig, started_at: startedAt,
    };

    logs.push({ timestamp: now(), level: "info", message: `Step TTS: ${stepName}`, stepKey });

    // Get input text from previous step
    const scriptOutput = getPreviousOutputKey(previousOutputs, "roteiro") || previousOutputs.roteiro;
    const ssmlOutput = getPreviousOutputKey(previousOutputs, "parse_ssml") || previousOutputs.parse_ssml;

    let textInput = "";
    for (const candidate of [ssmlOutput, scriptOutput]) {
        if (!textInput && candidate) {
            if (typeof candidate === "string" && candidate.length > 0) {
                textInput = candidate;
            } else if (typeof candidate === "object" && candidate !== null) {
                const obj = candidate as Record<string, unknown>;
                textInput = String(obj.ssml || obj.output || obj.script || obj.text || "");
            }
        }
    }

    if (!textInput) textInput = String(input.text || input.script || "");

    if (!textInput) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = { code: "NO_INPUT", message: "Nenhum texto/SSML para sintetizar" };
        return stepManifest;
    }

    // Load voice preset
    if (!stepConfig.preset_voice?.id) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = { code: "NO_VOICE_PRESET", message: "Nenhum preset de voz configurado" };
        return stepManifest;
    }

    const voicePreset = await loadVoicePreset(stepConfig.preset_voice.id);
    if (!voicePreset) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = { code: "VOICE_PRESET_NOT_FOUND", message: "Voice preset não encontrado" };
        return stepManifest;
    }

    // Load SSML preset
    const ssmlPreset = stepConfig.preset_ssml?.id ? await loadSsmlPreset(stepConfig.preset_ssml.id) : null;

    // Load provider
    const provider = stepConfig.provider?.id ? await loadProvider(stepConfig.provider.id) : null;

    // Output path
    const artifactDir = await ensureArtifactDir(jobId, stepKey);
    const outputPath = `${artifactDir}/audio.mp3`;

    logs.push({ timestamp: now(), level: "info", message: `Chamando Azure TTS: voice=${voicePreset.voice_name}`, stepKey });

    // Execute TTS via providers.ts
    const ttsResult = await executeTTSProvider({
        provider: provider || { id: "", slug: "azure", name: "Azure TTS", type: "tts", config: {} },
        input: textInput,
        voicePreset: {
            id: voicePreset.id,
            voiceName: voicePreset.voice_name,
            language: voicePreset.language,
            rate: voicePreset.rate || undefined,
            pitch: voicePreset.pitch || undefined,
            style: voicePreset.style || undefined,
            styleDegree: voicePreset.style_degree || undefined,
        },
        ssmlPreset: ssmlPreset ? {
            id: ssmlPreset.id,
            pauseMapping: typeof ssmlPreset.pause_mappings === "string"
                ? JSON.parse(ssmlPreset.pause_mappings)
                : (ssmlPreset.pause_mappings || {}),
        } : undefined,
        outputPath,
    });

    if (!ttsResult.success) {
        stepManifest.status = "failed";
        stepManifest.completed_at = now();
        stepManifest.error = ttsResult.error;
        logs.push({ timestamp: now(), level: "error", message: `TTS falhou: ${ttsResult.error?.message}`, stepKey });
        return stepManifest;
    }

    logs.push({
        timestamp: now(), level: "info",
        message: `Áudio gerado: ${ttsResult.durationSec}s, ${Math.round((ttsResult.fileSizeBytes || 0) / 1024)}KB`,
        stepKey,
    });

    stepManifest.artifacts = [{
        uri: ttsResult.artifactUri!, content_type: ttsResult.contentType || "audio/mpeg",
        size_bytes: ttsResult.fileSizeBytes, duration_sec: ttsResult.durationSec,
    }];

    stepManifest.status = "success";
    stepManifest.completed_at = now();
    stepManifest.duration_ms = Date.now() - new Date(startedAt).getTime();
    stepManifest.response = { output: { audioPath: ttsResult.artifactUri, durationSec: ttsResult.durationSec } };

    return stepManifest;
}

async function executeStepTransform(
    stepKey: string,
    stepName: string,
    stepConfig: ResolvedConfig,
    input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string,
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind: StepKind = getStepKind(stepKey);

    logs.push({ timestamp: now(), level: "info", message: `Step Transform: ${stepName}`, stepKey });

    // Get script from previousOutputs
    let rawScript = "";
    const scriptOutput = getPreviousOutputKey(previousOutputs, "roteiro") || previousOutputs.roteiro || previousOutputs.script;
    if (typeof scriptOutput === "string") {
        rawScript = scriptOutput;
    } else if (scriptOutput && typeof scriptOutput === "object" && "output" in scriptOutput) {
        rawScript = String((scriptOutput as Record<string, unknown>).output || "");
    }

    if (!rawScript) {
        return {
            key: stepKey, kind, status: "failed", config: stepConfig,
            started_at: startedAt, completed_at: now(), duration_ms: 0,
            error: { code: "MISSING_SCRIPT", message: "Roteiro não encontrado nos outputs anteriores" },
        };
    }

    // Clean script (mirroring VFOS parse_ssml logic)
    const cleanScript = rawScript
        .replace(/\(voz:\s*[^)]+\)/gi, "")
        .replace(/\[PAUSA[^\]]*\]/gi, "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
        .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
        .replace(/<voice[^>]*>/gi, "").replace(/<\/voice>/gi, "")
        .replace(/<break[^>]*\/?>/gi, "")
        .replace(/<speak[^>]*>/gi, "").replace(/<\/speak>/gi, "")
        .replace(/<prosody[^>]*>/gi, "").replace(/<\/prosody>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&/g, " e ")
        .replace(/[ \t]+$/gm, "")
        .replace(/ {2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const wordCount = cleanScript.split(/\s+/).filter((w) => w.length > 0).length;
    logs.push({ timestamp: now(), level: "info", message: `Cleaned script: ${wordCount} words`, stepKey });

    // Save artifact
    const artifactDir = await ensureArtifactDir(jobId, stepKey);
    const outputPath = `${artifactDir}/output.txt`;
    const fs = await import("fs/promises");
    await fs.writeFile(outputPath, cleanScript, "utf-8");

    return {
        key: stepKey, kind, status: "success", config: stepConfig,
        started_at: startedAt, completed_at: now(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        artifacts: [{ uri: outputPath, content_type: "text/plain" }],
        response: { output: cleanScript },
    };
}

async function executeStepRender(
    stepKey: string,
    stepName: string,
    stepConfig: ResolvedConfig,
    input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string,
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind: StepKind = getStepKind(stepKey);

    logs.push({ timestamp: now(), level: "info", message: `Step Render: ${stepName}`, stepKey });

    // Get audio from TTS step
    const ttsOutput = getPreviousOutputKey(previousOutputs, "tts") as { audioPath?: string; durationSec?: number } | string | undefined;
    let audioPath: string | undefined;

    if (typeof ttsOutput === "string" && ttsOutput.includes("/")) {
        audioPath = ttsOutput;
    } else if (ttsOutput && typeof ttsOutput === "object") {
        audioPath = ttsOutput.audioPath;
    }

    if (!audioPath) {
        logs.push({ timestamp: now(), level: "warn", message: "Nenhum áudio encontrado do step TTS — render ignorado", stepKey });
        return {
            key: stepKey, kind, status: "success", config: stepConfig,
            started_at: startedAt, completed_at: now(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
            response: { output: { skipped: true, reason: "No audio available" } },
        };
    }

    const artifactDir = await ensureArtifactDir(jobId, stepKey);
    const outputPath = `${artifactDir}/video.mp4`;

    // Load video preset
    const videoPresetId = stepConfig.preset_video?.id;
    const loadedPreset = videoPresetId ? await loadVideoPreset(videoPresetId) : null;
    const preset = loadedPreset || {
        encoder: "libx264", scale: "1920:1080", fps: 30,
        bitrate: "4000k", pixelFormat: "yuv420p",
        audioCodec: "aac", audioBitrate: "192k",
    };

    logs.push({
        timestamp: now(), level: "info",
        message: `Renderizando vídeo: encoder=${preset.encoder}, scale=${preset.scale}`,
        stepKey,
    });

    // Try to import and use FFmpeg renderer
    try {
        const { renderVideo } = await import("./ffmpeg");
        const renderResult = await renderVideo({
            audioPath,
            backgroundImagePath: (input.avatarPath as string) || undefined,
            outputPath,
            preset,
        });

        if (!renderResult.success) {
            logs.push({ timestamp: now(), level: "error", message: `Render falhou: ${renderResult.error?.message}`, stepKey });
            return {
                key: stepKey, kind, status: "failed", config: stepConfig,
                started_at: startedAt, completed_at: now(),
                error: renderResult.error,
            };
        }

        return {
            key: stepKey, kind, status: "success", config: stepConfig,
            started_at: startedAt, completed_at: now(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
            artifacts: [{
                uri: outputPath, content_type: "video/mp4",
                size_bytes: renderResult.fileSizeBytes, duration_sec: renderResult.durationSec,
            }],
            response: { output: { videoPath: outputPath, durationSec: renderResult.durationSec } },
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "FFmpeg unavailable";
        logs.push({ timestamp: now(), level: "warn", message: `Render skipped: ${msg}`, stepKey });
        return {
            key: stepKey, kind, status: "success", config: stepConfig,
            started_at: startedAt, completed_at: now(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
            response: { output: { skipped: true, reason: msg } },
        };
    }
}

async function executeStepExport(
    stepKey: string,
    stepName: string,
    stepConfig: ResolvedConfig,
    _input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string,
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind: StepKind = getStepKind(stepKey);

    logs.push({ timestamp: now(), level: "info", message: `Step Export: ${stepName}`, stepKey });

    try {
        const { exportJob } = await import("./export");
        const artifactsDir = getArtifactPath(jobId, stepKey, "");

        const exportResult = await exportJob({
            jobId, artifactsDir, previousOutputs, manifest: {},
        });

        if (!exportResult.success) {
            return {
                key: stepKey, kind, status: "failed", config: stepConfig,
                started_at: startedAt, completed_at: now(),
                error: exportResult.error,
            };
        }

        const artifacts = [];
        if (exportResult.manifestPath) {
            artifacts.push({ uri: exportResult.manifestPath, content_type: "application/json" });
        }
        if (exportResult.thumbnailPath) {
            artifacts.push({ uri: exportResult.thumbnailPath, content_type: "image/jpeg" });
        }

        return {
            key: stepKey, kind, status: "success", config: stepConfig,
            started_at: startedAt, completed_at: now(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
            artifacts,
            response: { output: { exported: true, exportPath: exportResult.exportPath } },
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Export unavailable";
        logs.push({ timestamp: now(), level: "warn", message: `Export skipped: ${msg}`, stepKey });
        return {
            key: stepKey, kind, status: "success", config: stepConfig,
            started_at: startedAt, completed_at: now(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
            response: { output: { skipped: true, reason: msg } },
        };
    }
}

async function executeStepScenePrompts(
    stepKey: string,
    stepName: string,
    stepConfig: ResolvedConfig,
    input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string,
    language: string,
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind: StepKind = getStepKind(stepKey);

    logs.push({ timestamp: now(), level: "info", message: `Step Scene Prompts: ${stepName}`, stepKey });

    // Use LLM to generate scene prompts
    return executeStepLLM(stepKey, stepName, stepConfig, input, previousOutputs, logs, jobId, language);
}

async function executeStepGenerateImages(
    stepKey: string,
    stepName: string,
    stepConfig: ResolvedConfig,
    _input: Record<string, unknown>,
    previousOutputs: Record<string, unknown>,
    logs: LogEntry[],
    jobId: string,
): Promise<StepManifest> {
    const now = () => new Date().toISOString();
    const startedAt = now();
    const kind: StepKind = getStepKind(stepKey);

    logs.push({ timestamp: now(), level: "info", message: `Step Generate Images: ${stepName}`, stepKey });

    // Get scene prompts from previous step
    const scenePromptsRaw = getPreviousOutputKey(previousOutputs, "prompts_cenas") || previousOutputs.prompts_cenas;

    if (!scenePromptsRaw) {
        return {
            key: stepKey, kind, status: "success", config: stepConfig,
            started_at: startedAt, completed_at: now(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
            response: { output: { skipped: true, reason: "No scene prompts available" } },
        };
    }

    // Parse scene prompts
    let scenes: Array<{ scene: number; prompt: string }> = [];
    const text = typeof scenePromptsRaw === "string" ? scenePromptsRaw : String((scenePromptsRaw as Record<string, unknown>).output || scenePromptsRaw);

    try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            scenes = JSON.parse(jsonMatch[0]);
        }
    } catch {
        logs.push({ timestamp: now(), level: "warn", message: "Não foi possível parsear JSON de cenas", stepKey });
    }

    if (scenes.length === 0) {
        return {
            key: stepKey, kind, status: "success", config: stepConfig,
            started_at: startedAt, completed_at: now(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
            response: { output: { images: [], reason: "No scenes parsed" } },
        };
    }

    // Try to generate images via ImageFX
    const artifactDir = await ensureArtifactDir(jobId, stepKey);
    const generatedImages: Array<{ scene_number: number; image_path: string; success: boolean }> = [];

    try {
        const { generateImageFX } = await import("../adapters/imagefx");
        const cookies = process.env.IMAGEFX_COOKIES || "";

        if (!cookies) {
            logs.push({ timestamp: now(), level: "warn", message: "IMAGEFX_COOKIES não configurado — imagens ignoradas", stepKey });
        } else {
            for (const scene of scenes) {
                try {
                    const result = await generateImageFX(scene.prompt, { cookies, aspect_ratio: "LANDSCAPE", num_images: 1 });
                    let imagePath = "";
                    if (result.success && result.images?.length) {
                        const fs = await import("fs/promises");
                        imagePath = `${artifactDir}/scene_${scene.scene}.png`;
                        await fs.writeFile(imagePath, result.images[0]);
                    }
                    generatedImages.push({
                        scene_number: scene.scene,
                        image_path: imagePath,
                        success: result.success,
                    });
                    if (result.success) {
                        logs.push({ timestamp: now(), level: "info", message: `Imagem cena ${scene.scene} gerada`, stepKey });
                    }
                } catch {
                    generatedImages.push({ scene_number: scene.scene, image_path: "", success: false });
                }
            }
        }
    } catch {
        logs.push({ timestamp: now(), level: "warn", message: "ImageFX não disponível — imagens ignoradas", stepKey });
    }

    return {
        key: stepKey, kind, status: "success", config: stepConfig,
        started_at: startedAt, completed_at: now(),
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        artifacts: generatedImages.filter((i) => i.success).map((i) => ({
            uri: i.image_path, content_type: "image/png",
        })),
        response: {
            output: {
                images: generatedImages,
                images_dir: artifactDir,
                total: scenes.length,
                generated: generatedImages.filter((i) => i.success).length,
            },
        },
    };
}

// ============================================
// MAIN RUNNER
// ============================================

export async function runJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceClient();

    // 1. Load job
    const { data: job, error: jobErr } = await supabase
        .from("jobs").select("*").eq("id", jobId).single();

    if (jobErr || !job) return { success: false, error: "Job não encontrado" };
    if (job.state === "DONE") return { success: false, error: "Job já foi concluído" };
    if (job.state === "CANCELLED") return { success: false, error: "Job cancelado" };

    // 2. Load recipe
    const { data: recipe, error: recipeErr } = await supabase
        .from("recipes").select("*").eq("key", job.recipe_key).single();

    if (recipeErr || !recipe) return { success: false, error: `Recipe não encontrada: ${job.recipe_key}` };

    const steps: PipelineStep[] = (recipe.steps || []) as PipelineStep[];
    if (steps.length === 0) return { success: false, error: "Pipeline vazia" };

    // 3. Create manifest + resolve config for ALL steps upfront
    const manifest = createInitialManifest(jobId, job.recipe_key, job.language);

    for (const step of steps) {
        const config = await resolveStepConfig(recipe.key, step.key);
        manifest.snapshots.config_by_step[step.key] = config;
    }

    // 4. Update job to running
    const startedAt = new Date().toISOString();
    await supabase.from("jobs").update({
        state: "SCRIPTING",
        progress: 0,
        started_at: startedAt,
        manifest,
    }).eq("id", jobId);

    await emitEvent(supabase, jobId, "state_changed", {
        from: job.state, to: "SCRIPTING", action: "pipeline_start",
    });

    // 5. Create job_steps records (only if they don't exist — idempotent for retry)
    const { data: existingSteps } = await supabase
        .from("job_steps").select("step_key, status, output").eq("job_id", jobId);

    const existingStepKeys = new Set((existingSteps || []).map((s) => s.step_key));

    for (let i = 0; i < steps.length; i++) {
        if (!existingStepKeys.has(steps[i].key)) {
            await supabase.from("job_steps").insert({
                job_id: jobId,
                step_key: steps[i].key,
                status: "pending",
                started_at: null,
                completed_at: null,
            });
        }
    }

    // 6. Load outputs from already completed steps (for resume)
    const previousOutputs: Record<string, unknown> = {};
    const input = (typeof job.input === "string" ? JSON.parse(job.input) : job.input) || {};

    // Merge job-level fields into input
    if (job.title && !input.title) input.title = job.title;
    if (!input.topic && input.title) input.topic = input.title;

    for (const step of (existingSteps || [])) {
        if (step.status === "completed" && step.output) {
            const out = typeof step.output === "string" ? JSON.parse(step.output) : step.output;
            previousOutputs[step.step_key] = out.text || out.output || out;
        }
    }

    // 7. Execute steps sequentially
    const allLogs: LogEntry[] = [];
    let lastError: string | null = null;
    let jobFailed = false;

    for (let i = 0; i < steps.length; i++) {
        if (jobFailed) break;

        const stepDef = steps[i];
        const kind = getStepKind(stepDef.key);
        const stepConfig = manifest.snapshots.config_by_step[stepDef.key] || {};
        const progress = Math.round(((i + 1) / steps.length) * 100);

        // Check if already completed (resume)
        const { data: stepRows } = await supabase
            .from("job_steps").select("*").eq("job_id", jobId).eq("step_key", stepDef.key);
        const stepRow = stepRows?.[0];

        if (stepRow?.status === "completed") {
            console.log(`[Runner] Skipping completed step: ${stepDef.key}`);
            continue;
        }

        // Check if cancelled BEFORE starting
        const { data: currentJob } = await supabase
            .from("jobs").select("state").eq("id", jobId).single();
        if (currentJob?.state === "CANCELLED") {
            if (stepRow) {
                await supabase.from("job_steps").update({ status: "skipped" })
                    .eq("job_id", jobId).eq("step_key", stepDef.key);
            }
            break;
        }

        // Update step to running
        const stepStartedAt = new Date().toISOString();
        await supabase.from("job_steps").update({
            status: "running", started_at: stepStartedAt,
        }).eq("job_id", jobId).eq("step_key", stepDef.key);

        // Update job state based on step mapping
        const stateMapping = STEP_TO_STATE[stepDef.key];
        if (stateMapping) {
            await supabase.from("jobs").update({
                state: stateMapping.running,
                progress: Math.round((i / steps.length) * 100),
            }).eq("id", jobId);
        }

        await emitEvent(supabase, jobId, "step_started", {
            step_key: stepDef.key, step_type: kind, label: stepDef.label,
        });

        console.log(`[Runner] Executing step ${stepDef.key} (${kind}) - progress: ${progress}%`);

        // Execute based on kind
        let stepManifest: StepManifest;

        switch (kind) {
            case "llm":
                stepManifest = await executeStepLLM(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId, job.language);
                break;
            case "tts":
                stepManifest = await executeStepTTS(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId);
                break;
            case "transform":
                stepManifest = await executeStepTransform(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId);
                break;
            case "render":
                stepManifest = await executeStepRender(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId);
                break;
            case "export":
                stepManifest = await executeStepExport(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId);
                break;
            case "scene_prompts":
                stepManifest = await executeStepScenePrompts(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId, job.language);
                break;
            case "generate_images":
                stepManifest = await executeStepGenerateImages(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId);
                break;
            default:
                stepManifest = await executeStepTransform(stepDef.key, stepDef.label, stepConfig, input, previousOutputs, allLogs, jobId);
        }

        // Update step record
        const stepCompletedAt = new Date().toISOString();
        const durationMs = stepManifest.duration_ms || 0;

        if (stepManifest.status === "success") {
            previousOutputs[stepDef.key] = stepManifest.response?.output;

            await supabase.from("job_steps").update({
                status: "completed",
                output: { text: typeof stepManifest.response?.output === "string" ? stepManifest.response.output : JSON.stringify(stepManifest.response?.output || {}), usage: stepManifest.response?.usage },
                completed_at: stepCompletedAt,
            }).eq("job_id", jobId).eq("step_key", stepDef.key);

            // Save artifacts to DB
            if (stepManifest.artifacts) {
                for (const artifact of stepManifest.artifacts) {
                    await supabase.from("artifacts").insert({
                        job_id: jobId,
                        step_key: stepDef.key,
                        path: artifact.uri,
                        mime_type: artifact.content_type,
                        file_size: artifact.size_bytes || 0,
                    });
                    manifest.artifacts.push({
                        step_key: stepDef.key, uri: artifact.uri, content_type: artifact.content_type,
                    });
                }
            }

            await emitEvent(supabase, jobId, "step_completed", {
                step_key: stepDef.key, duration_ms: durationMs,
                usage: stepManifest.response?.usage,
            });

            // Update job state to step's done state
            if (stateMapping) {
                await supabase.from("jobs").update({
                    state: stateMapping.done,
                    progress,
                }).eq("id", jobId);
            }

            // Track LLM usage
            if (stepManifest.response?.usage) {
                const u = stepManifest.response.usage;
                manifest.metrics.llm_tokens_used += (u.inputTokens || 0) + (u.outputTokens || 0);
            }

        } else {
            lastError = stepManifest.error?.message || "Step falhou";
            jobFailed = true;

            await supabase.from("job_steps").update({
                status: "failed",
                error: lastError,
                completed_at: stepCompletedAt,
            }).eq("job_id", jobId).eq("step_key", stepDef.key);

            await emitEvent(supabase, jobId, "step_failed", {
                step_key: stepDef.key, error: lastError,
            });
        }

        manifest.steps.push(stepManifest);
    }

    // 8. Finalize job
    const completedAt = new Date().toISOString();
    manifest.updated_at = completedAt;
    manifest.metrics.total_duration_ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    manifest.metrics.step_count = manifest.steps.length;

    const { data: finalJob } = await supabase
        .from("jobs").select("state").eq("id", jobId).single();

    const finalStatus = finalJob?.state === "CANCELLED" ? "CANCELLED" : (jobFailed ? "FAILED" : "DONE");

    await supabase.from("jobs").update({
        state: finalStatus,
        completed_at: finalStatus === "DONE" ? completedAt : undefined,
        progress: finalStatus === "DONE" ? 100 : undefined,
        error_message: lastError,
        manifest,
    }).eq("id", jobId);

    await emitEvent(supabase, jobId, "state_changed", {
        from: finalJob?.state, to: finalStatus, action: "pipeline_complete",
    });

    console.log(`[Runner] Job ${jobId} finished: ${finalStatus} in ${manifest.metrics.total_duration_ms}ms`);

    return { success: !jobFailed, error: lastError || undefined };
}

// ============================================
// JOB CONTROL
// ============================================

export async function retryJobStep(jobId: string, stepKey: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceClient();

    // Reset step to pending
    await supabase.from("job_steps").update({
        status: "pending", error: null,
    }).eq("job_id", jobId).eq("step_key", stepKey);

    // Reset job to ready
    await supabase.from("jobs").update({
        state: "READY", error_message: null,
    }).eq("id", jobId);

    return { success: true };
}

export async function cancelJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceClient();

    await supabase.from("jobs").update({
        state: "CANCELLED",
        error_message: "Cancelado pelo usuário",
    }).eq("id", jobId);

    return { success: true };
}

// ============================================
// HELPERS
// ============================================

async function emitEvent(
    supabase: ReturnType<typeof createServiceClient>,
    jobId: string,
    type: string,
    data: Record<string, unknown>,
) {
    await supabase.from("job_events").insert({ job_id: jobId, type, data });
}
