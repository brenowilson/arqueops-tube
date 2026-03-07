/**
 * Step Capabilities - Slot mappings per step kind
 * Ported from Video Factory OS
 */

export type StepKind = 'llm' | 'tts' | 'transform' | 'render' | 'export' | 'scene_prompts' | 'generate_images';

export type SlotType =
    | 'prompt'
    | 'provider'
    | 'preset_voice'
    | 'preset_ssml'
    | 'preset_video'
    | 'preset_effects'
    | 'validators'
    | 'kb';

export interface StepCapability {
    kind: StepKind;
    requiredSlots: SlotType[];
    optionalSlots: SlotType[];
    providerType?: 'llm' | 'tts' | 'render';
}

export const STEP_CAPABILITIES: Record<StepKind, StepCapability> = {
    llm: {
        kind: 'llm',
        requiredSlots: ['prompt', 'provider'],
        optionalSlots: ['validators', 'kb'],
        providerType: 'llm',
    },
    tts: {
        kind: 'tts',
        requiredSlots: ['provider', 'preset_voice'],
        optionalSlots: ['preset_ssml', 'validators'],
        providerType: 'tts',
    },
    transform: {
        kind: 'transform',
        requiredSlots: [],
        optionalSlots: ['validators'],
    },
    render: {
        kind: 'render',
        requiredSlots: ['preset_video'],
        optionalSlots: ['preset_effects'],
        providerType: 'render',
    },
    export: {
        kind: 'export',
        requiredSlots: [],
        optionalSlots: [],
    },
    scene_prompts: {
        kind: 'scene_prompts',
        requiredSlots: [],
        optionalSlots: ['prompt', 'provider', 'kb'],
        providerType: 'llm',
    },
    generate_images: {
        kind: 'generate_images',
        requiredSlots: [],
        optionalSlots: [],
    },
};

export const STEP_KIND_MAP: Record<string, StepKind> = {
    title: 'llm',
    titulo: 'llm',
    brief: 'llm',
    script: 'llm',
    roteiro: 'llm',
    ideacao: 'llm',
    planejamento: 'llm',
    analysis: 'llm',
    parse_ssml: 'transform',
    tts: 'tts',
    render: 'render',
    export: 'export',
    prompts_cenas: 'scene_prompts',
    scene_prompts: 'scene_prompts',
    gerar_imagens: 'generate_images',
    generate_images: 'generate_images',
    miniaturas: 'llm',
};

export function getStepKind(stepKey: string): StepKind {
    return STEP_KIND_MAP[stepKey] || 'transform';
}

export function getStepCapability(stepKey: string): StepCapability {
    const kind = getStepKind(stepKey);
    return STEP_CAPABILITIES[kind];
}

export function getAllowedSlots(stepKey: string): SlotType[] {
    const cap = getStepCapability(stepKey);
    return [...cap.requiredSlots, ...cap.optionalSlots];
}

export function isSlotAllowed(stepKey: string, slot: SlotType): boolean {
    return getAllowedSlots(stepKey).includes(slot);
}

export function getRequiredSlots(stepKey: string): SlotType[] {
    return getStepCapability(stepKey).requiredSlots;
}

export const SLOT_LABELS: Record<SlotType, string> = {
    prompt: 'Prompt',
    provider: 'Provider',
    preset_voice: 'Voice Preset',
    preset_ssml: 'SSML Preset',
    preset_video: 'Video Preset',
    preset_effects: 'Effects Preset',
    validators: 'Validators',
    kb: 'Knowledge Base',
};

export const KIND_LABELS: Record<StepKind, string> = {
    llm: 'LLM (Geração)',
    tts: 'TTS (Áudio)',
    transform: 'Transform',
    render: 'Render (Vídeo)',
    export: 'Export',
    scene_prompts: 'Scene Prompts (Imagens)',
    generate_images: 'Gerar Imagens',
};
