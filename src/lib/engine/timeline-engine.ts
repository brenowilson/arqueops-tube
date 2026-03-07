/**
 * Timeline Engine Module
 * 
 * Exports centralizados para os novos módulos do Render Engine.
 * 
 * Gates:
 * - 2.0: Timeline DSL + Runner Integration
 * - 2.2: Worker local (single Mac)
 * - 2.3: Queue + Status + Retry
 * - 2.4: Presets FFmpeg (VideoToolbox)
 * - 2.5: Artefacts + Logs estruturados
 */

// Recipe to Timeline conversion
export {
    buildTimelineFromRecipe,
    type RecipeContext,
    type PreviousOutputs,
    type BuildTimelineOptions,
} from './recipe-to-timeline';

// Timeline executor
export {
    executeRenderPlan,
    executeRenderStep,
    getExecutionSummary,
    type ExecutorOptions,
} from './timeline-executor';

// Render worker (queue + concurrency)
export {
    RenderQueue,
    RenderWorker,
    getRenderWorker,
    submitRenderJob,
    type RenderJob,
    type RenderJobStatus,
    type WorkerConfig,
    type WorkerStatus,
} from './render-worker';

// Preset registry (VideoToolbox + platforms)
export {
    PRESET_REGISTRY,
    getPreset,
    getDefaultPreset,
    getPresetForFormat,
    getPresetForPlatform,
    listPresets,
    isVideoToolboxAvailable,
    getBestPreset,
    type PresetRegistry,
} from './preset-registry';

// Render logger (structured logs)
export {
    RenderLogger,
    ConsoleSink,
    FileSink,
    MemorySink,
    getRenderLogger,
    createJobLogger,
    type LogLevel,
    type RenderLogEntry,
    type RenderLogSummary,
    type LogSink,
} from './render-logger';
