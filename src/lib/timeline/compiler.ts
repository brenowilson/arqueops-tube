/**
 * Timeline Compiler
 *
 * Compila Timeline DSL → RenderPlan.
 * Transforma descrição declarativa em comandos FFmpeg executáveis.
 *
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

import { createHash } from 'crypto';
import type { Timeline, Scene, Element } from './schema';
import { getTimelineDuration } from './schema';
import { validateTimeline } from './validator';
import {
    RenderPlan,
    RenderStep,
    VideoEncodePreset,
    DEFAULT_ENCODE_PRESETS,
    createEmptyRenderPlan,
    createRenderStep,
    sortStepsByDependencies,
} from './render-plan';

// ===========================================
// COMPILER OPTIONS
// ===========================================

export interface CompilerOptions {
    jobId: string;
    outputDir: string;
    encodePreset?: string | VideoEncodePreset;
    enableSubtitles?: boolean;
    dryRun?: boolean;
}

// ===========================================
// COMPILER RESULT
// ===========================================

export interface CompilerResult {
    success: boolean;
    plan?: RenderPlan;
    errors: string[];
    warnings: string[];
}

// ===========================================
// MAIN COMPILER FUNCTION
// ===========================================

/**
 * Compila uma Timeline em um RenderPlan
 */
export function compileTimeline(
    timeline: Timeline,
    options: CompilerOptions
): CompilerResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validar timeline
    const validation = validateTimeline(timeline);
    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
            warnings: validation.warnings.map((w) => `${w.path}: ${w.message}`),
        };
    }

    // Adicionar warnings da validação
    warnings.push(...validation.warnings.map((w) => `${w.path}: ${w.message}`));

    // 2. Criar RenderPlan base
    const plan = createEmptyRenderPlan(options.jobId);
    plan.timelineHash = hashTimeline(timeline);

    // 3. Resolver preset de encode
    const encodePreset = resolveEncodePreset(options.encodePreset, timeline);

    // 4. Gerar steps por cena
    const steps: RenderStep[] = [];
    let stepCounter = 0;

    for (const scene of timeline.scenes) {
        const sceneSteps = compileScene(
            scene,
            timeline.settings,
            encodePreset,
            options,
            () => `step-${++stepCounter}`
        );
        steps.push(...sceneSteps);
    }

    // 5. Adicionar step de composição final (se múltiplas cenas)
    if (timeline.scenes.length > 1) {
        const sceneOutputs = steps
            .filter((s) => s.type === 'compose')
            .map((s) => s.output);

        const finalStep = createRenderStep(
            `step-${++stepCounter}`,
            'encode',
            buildConcatCommand(
                sceneOutputs,
                `${options.outputDir}/output.mp4`,
                encodePreset
            ),
            sceneOutputs,
            `${options.outputDir}/output.mp4`,
            steps.filter((s) => s.type === 'compose').map((s) => s.id),
            { description: 'Concatenar cenas e encode final' }
        );
        steps.push(finalStep);
        plan.finalOutput = finalStep.output;
    } else if (steps.length > 0) {
        // Única cena - último step é o output final
        const lastStep = steps[steps.length - 1];
        plan.finalOutput = lastStep.output;
    }

    // 6. Ordenar por dependências
    try {
        plan.steps = sortStepsByDependencies(steps);
    } catch (error) {
        errors.push(`Erro ao ordenar steps: ${error}`);
        return { success: false, errors, warnings };
    }

    return {
        success: true,
        plan,
        errors,
        warnings,
    };
}

// ===========================================
// SCENE COMPILER
// ===========================================

function compileScene(
    scene: Scene,
    settings: Timeline['settings'],
    encodePreset: VideoEncodePreset,
    options: CompilerOptions,
    nextStepId: () => string
): RenderStep[] {
    const steps: RenderStep[] = [];

    // Separar elementos por tipo
    const videoElements = scene.elements.filter((e) => e.type === 'video');
    const audioElements = scene.elements.filter((e) => e.type === 'audio');
    const subtitleElements = scene.elements.filter((e) => e.type === 'subtitle');

    // Verificar se temos pelo menos um vídeo de base
    if (videoElements.length === 0) {
        // Gerar vídeo de cor sólida como base
        const baseVideoPath = `${options.outputDir}/scene-${scene.id}-base.mp4`;
        const baseStep = createRenderStep(
            nextStepId(),
            'prepare',
            buildColorVideoCommand(
                settings.backgroundColor ?? '#000000',
                scene.duration,
                settings.width,
                settings.height,
                settings.fps,
                baseVideoPath
            ),
            [],
            baseVideoPath,
            [],
            { description: `Gerar vídeo base para cena ${scene.id}`, sceneId: scene.id }
        );
        steps.push(baseStep);
    }

    // Compor vídeo + áudio + legendas
    const outputPath = `${options.outputDir}/scene-${scene.id}.mp4`;
    const inputPaths: string[] = [];
    const dependencies: string[] = [];

    // Adicionar vídeo principal
    if (videoElements.length > 0) {
        inputPaths.push(videoElements[0].src!);
    } else {
        // Usar vídeo base gerado
        inputPaths.push(`${options.outputDir}/scene-${scene.id}-base.mp4`);
        dependencies.push(steps[steps.length - 1].id);
    }

    // Adicionar áudios
    for (const audio of audioElements) {
        if (audio.src) {
            inputPaths.push(audio.src);
        }
    }

    // Gerar comando de composição
    const composeCommand = buildComposeCommand(
        inputPaths,
        outputPath,
        scene,
        settings,
        encodePreset,
        options.enableSubtitles ? subtitleElements : []
    );

    const composeStep = createRenderStep(
        nextStepId(),
        'compose',
        composeCommand,
        inputPaths,
        outputPath,
        dependencies,
        {
            description: `Compor cena ${scene.id}`,
            sceneId: scene.id,
            elementIds: scene.elements.map((e) => e.id),
        }
    );
    steps.push(composeStep);

    return steps;
}

// ===========================================
// FFMPEG COMMAND BUILDERS
// ===========================================

function buildComposeCommand(
    inputs: string[],
    output: string,
    scene: Scene,
    settings: Timeline['settings'],
    preset: VideoEncodePreset,
    subtitles: Element[]
): string {
    const parts: string[] = ['ffmpeg', '-y'];

    // Inputs
    for (const input of inputs) {
        parts.push(`-i "${input}"`);
    }

    // Filtros
    const filters: string[] = [];

    // Escala do vídeo
    if (preset.scale) {
        filters.push(`scale=${preset.scale}`);
    }

    // Legendas (burn-in)
    if (subtitles.length > 0) {
        const sub = subtitles[0];
        const subPath = sub.props.srtPath || sub.props.assPath;
        if (subPath) {
            filters.push(`subtitles='${subPath}'`);
        }
    }

    // Aplicar filtros
    if (filters.length > 0) {
        parts.push(`-vf "${filters.join(',')}"`);
    }

    // Encoder de vídeo
    parts.push(`-c:v ${preset.encoder}`);
    parts.push(`-b:v ${preset.bitrate}`);
    parts.push(`-pix_fmt ${preset.pixelFormat}`);

    if (preset.fps) {
        parts.push(`-r ${preset.fps}`);
    }

    // Encoder de áudio
    parts.push(`-c:a ${preset.audioCodec}`);
    parts.push(`-b:a ${preset.audioBitrate}`);

    // Mix de áudio (se múltiplos inputs)
    if (inputs.length > 1) {
        // Simples: usar o segundo input como áudio
        parts.push('-map 0:v:0 -map 1:a:0');
    }

    // Extra args
    if (preset.extraArgs) {
        parts.push(...preset.extraArgs);
    }

    // Output
    parts.push(`"${output}"`);

    return parts.join(' ');
}

function buildConcatCommand(
    inputs: string[],
    output: string,
    preset: VideoEncodePreset
): string {
    // Para concatenar, precisamos de um arquivo de lista
    // Simplificação: usar filter_complex concat
    const parts: string[] = ['ffmpeg', '-y'];

    for (const input of inputs) {
        parts.push(`-i "${input}"`);
    }

    const n = inputs.length;
    parts.push(
        `-filter_complex "concat=n=${n}:v=1:a=1[outv][outa]"`
    );
    parts.push('-map "[outv]" -map "[outa]"');

    // Re-encode com preset
    parts.push(`-c:v ${preset.encoder}`);
    parts.push(`-b:v ${preset.bitrate}`);
    parts.push(`-c:a ${preset.audioCodec}`);
    parts.push(`-b:a ${preset.audioBitrate}`);

    parts.push(`"${output}"`);

    return parts.join(' ');
}

function buildColorVideoCommand(
    color: string,
    duration: number,
    width: number,
    height: number,
    fps: number,
    output: string
): string {
    // Remover # do hex
    const colorHex = color.replace('#', '');

    return [
        'ffmpeg',
        '-y',
        `-f lavfi -i color=c=0x${colorHex}:s=${width}x${height}:r=${fps}:d=${duration}`,
        '-c:v libx264 -preset ultrafast',
        `"${output}"`,
    ].join(' ');
}

// ===========================================
// HELPERS
// ===========================================

function hashTimeline(timeline: Timeline): string {
    const content = JSON.stringify(timeline);
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function resolveEncodePreset(
    preset: string | VideoEncodePreset | undefined,
    timeline: Timeline
): VideoEncodePreset {
    if (typeof preset === 'object') {
        return preset;
    }

    if (typeof preset === 'string' && DEFAULT_ENCODE_PRESETS[preset]) {
        return DEFAULT_ENCODE_PRESETS[preset];
    }

    // Auto-detectar baseado no aspect ratio
    const isVertical = timeline.settings.height > timeline.settings.width;
    return isVertical
        ? DEFAULT_ENCODE_PRESETS['shorts-videotoolbox']
        : DEFAULT_ENCODE_PRESETS['longform-videotoolbox'];
}

// ===========================================
// EXPORTS
// ===========================================

export { DEFAULT_ENCODE_PRESETS };
