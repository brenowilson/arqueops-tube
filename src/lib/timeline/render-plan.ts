/**
 * RenderPlan Schema
 *
 * Define a estrutura imperativa para execução de render.
 * RenderPlan é gerado pelo Compiler a partir da Timeline.
 *
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

// ===========================================
// RENDER PLAN TYPES
// ===========================================

export interface RenderPlan {
    version: string;
    jobId: string;
    createdAt: string;
    timelineHash: string;
    steps: RenderStep[];
    finalOutput: string;
}

export interface RenderStep {
    id: string;
    type: StepType;
    /** Comando FFmpeg completo (ou outro executor) */
    command: string;
    /** Paths de entrada */
    inputs: string[];
    /** Path de saída */
    output: string;
    /** IDs de steps que precisam completar antes */
    dependencies: string[];
    /** Metadados para observabilidade */
    metadata: StepMetadata;
}

export type StepType =
    | 'prepare'    // baixar/converter assets
    | 'process'    // aplicar filtros, processar áudio
    | 'compose'    // juntar layers/cenas
    | 'encode';    // encode final com preset

export interface StepMetadata {
    description: string;
    estimatedDurationMs?: number;
    sceneId?: string;
    elementIds?: string[];
}

// ===========================================
// RENDER STEP EXECUTION STATUS
// ===========================================

export type StepExecutionStatus =
    | 'pending'
    | 'running'
    | 'success'
    | 'failed'
    | 'skipped';

export interface StepExecutionResult {
    stepId: string;
    status: StepExecutionStatus;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    outputPath?: string;
    error?: {
        code: string;
        message: string;
        stack?: string;
    };
    logs: string[];
}

// ===========================================
// RENDER PLAN EXECUTION
// ===========================================

export interface RenderPlanExecution {
    planId: string;
    jobId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt: string;
    completedAt?: string;
    currentStepId?: string;
    stepResults: StepExecutionResult[];
    finalOutputPath?: string;
}

// ===========================================
// FFMPEG PRESET (reutilizado de engine/ffmpeg.ts)
// ===========================================

export interface VideoEncodePreset {
    name: string;
    encoder: string;           // h264_videotoolbox, libx264, etc
    scale?: string;            // "1920:1080", "1080:1920"
    fps?: number;
    bitrate: string;           // "4M", "8M"
    pixelFormat: string;       // "yuv420p"
    audioCodec: string;        // "aac"
    audioBitrate: string;      // "192k"
    extraArgs?: string[];
}

export const DEFAULT_ENCODE_PRESETS: Record<string, VideoEncodePreset> = {
    'longform-videotoolbox': {
        name: 'Longform VideoToolbox',
        encoder: 'h264_videotoolbox',
        scale: '1920:1080',
        fps: 30,
        bitrate: '4M',
        pixelFormat: 'yuv420p',
        audioCodec: 'aac',
        audioBitrate: '192k',
    },
    'shorts-videotoolbox': {
        name: 'Shorts VideoToolbox',
        encoder: 'h264_videotoolbox',
        scale: '1080:1920',
        fps: 30,
        bitrate: '6M',
        pixelFormat: 'yuv420p',
        audioCodec: 'aac',
        audioBitrate: '192k',
    },
    'draft-fast': {
        name: 'Draft (rápido, baixa qualidade)',
        encoder: 'libx264',
        scale: '1280:720',
        fps: 30,
        bitrate: '2M',
        pixelFormat: 'yuv420p',
        audioCodec: 'aac',
        audioBitrate: '128k',
        extraArgs: ['-preset', 'ultrafast'],
    },
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Cria um RenderPlan vazio
 */
export function createEmptyRenderPlan(jobId: string): RenderPlan {
    return {
        version: '1.0.0',
        jobId,
        createdAt: new Date().toISOString(),
        timelineHash: '',
        steps: [],
        finalOutput: '',
    };
}

/**
 * Cria um RenderStep
 */
export function createRenderStep(
    id: string,
    type: StepType,
    command: string,
    inputs: string[],
    output: string,
    dependencies: string[] = [],
    metadata?: Partial<StepMetadata>
): RenderStep {
    return {
        id,
        type,
        command,
        inputs,
        output,
        dependencies,
        metadata: {
            description: metadata?.description ?? `Step ${id}`,
            ...metadata,
        },
    };
}

/**
 * Ordena steps por dependências (topological sort)
 */
export function sortStepsByDependencies(steps: RenderStep[]): RenderStep[] {
    const sorted: RenderStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const stepMap = new Map(steps.map((s) => [s.id, s]));

    function visit(stepId: string): void {
        if (visited.has(stepId)) return;
        if (visiting.has(stepId)) {
            throw new Error(`Dependência circular detectada: ${stepId}`);
        }

        const step = stepMap.get(stepId);
        if (!step) return;

        visiting.add(stepId);

        for (const dep of step.dependencies) {
            visit(dep);
        }

        visiting.delete(stepId);
        visited.add(stepId);
        sorted.push(step);
    }

    for (const step of steps) {
        visit(step.id);
    }

    return sorted;
}

/**
 * Valida RenderPlan
 */
export function validateRenderPlan(plan: RenderPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.jobId) {
        errors.push('jobId é obrigatório');
    }

    if (plan.steps.length === 0) {
        errors.push('RenderPlan não tem steps');
    }

    // Verificar dependências existem
    const stepIds = new Set(plan.steps.map((s) => s.id));
    for (const step of plan.steps) {
        for (const dep of step.dependencies) {
            if (!stepIds.has(dep)) {
                errors.push(`Step "${step.id}" depende de "${dep}" que não existe`);
            }
        }
    }

    // Verificar finalOutput
    if (!plan.finalOutput) {
        errors.push('finalOutput é obrigatório');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
