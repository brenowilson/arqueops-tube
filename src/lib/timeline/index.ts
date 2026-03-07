/**
 * Timeline DSL Module
 *
 * Exports para uso do módulo Timeline em outros lugares do projeto.
 *
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

// Schema types
export type {
    Timeline,
    TimelineSettings,
    Scene,
    Element,
    ElementType,
    ElementProps,
    SubtitleStyle,
    FormatProfile,
    SafeArea,
} from './schema';

export {
    FORMAT_PRESETS,
    SAFE_AREAS,
    getTimelineDuration,
    createEmptyTimeline,
    createScene,
    createVideoElement,
    createAudioElement,
    createSubtitleElement,
} from './schema';

// Validator
export {
    TimelineSchema,
    SceneSchema,
    ElementSchema,
    validateTimeline,
    parseTimelineOrThrow,
} from './validator';

export type { ValidationResult, ValidationError, ValidationWarning } from './validator';

// RenderPlan
export type {
    RenderPlan,
    RenderStep,
    StepType,
    StepMetadata,
    StepExecutionStatus,
    StepExecutionResult,
    RenderPlanExecution,
    VideoEncodePreset,
} from './render-plan';

export {
    DEFAULT_ENCODE_PRESETS,
    createEmptyRenderPlan,
    createRenderStep,
    sortStepsByDependencies,
    validateRenderPlan,
} from './render-plan';

// Compiler
export type { CompilerOptions, CompilerResult } from './compiler';

export { compileTimeline } from './compiler';
