/**
 * DarkFlow Job State Machine
 * Ported from Video Factory OS (riccodecarvalho/video-factory-os)
 */

export type JobState =
    | 'DRAFT'
    | 'READY'
    | 'SCRIPTING'
    | 'SCRIPT_DONE'
    | 'TTS_RUNNING'
    | 'TTS_DONE'
    | 'RENDER_READY'
    | 'RENDER_RUNNING'
    | 'DONE'
    | 'FAILED'
    | 'CANCELLED';

export type BoardColumn =
    | 'A_FAZER'
    | 'ROTEIRO'
    | 'NARRACAO'
    | 'VIDEO'
    | 'CONCLUIDO';

export interface Transition {
    from: JobState;
    to: JobState;
    trigger: 'user_action' | 'step_complete' | 'auto_advance' | 'error' | 'cancel';
}

export interface ExecutionResult {
    status: 'completed' | 'failed' | 'cancelled' | 'locked';
    lastStep?: string;
    step?: string;
    error?: unknown;
}

export const COLUMN_STATES: Record<BoardColumn, JobState[]> = {
    A_FAZER: ['DRAFT', 'READY'],
    ROTEIRO: ['SCRIPTING', 'SCRIPT_DONE'],
    NARRACAO: ['TTS_RUNNING', 'TTS_DONE'],
    VIDEO: ['RENDER_READY', 'RENDER_RUNNING'],
    CONCLUIDO: ['DONE'],
};

export const BADGE_STATES: JobState[] = ['FAILED', 'CANCELLED'];

export const ALLOWED_TRANSITIONS: Transition[] = [
    { from: 'DRAFT', to: 'READY', trigger: 'user_action' },
    { from: 'READY', to: 'SCRIPTING', trigger: 'user_action' },
    { from: 'SCRIPTING', to: 'SCRIPT_DONE', trigger: 'step_complete' },
    { from: 'SCRIPT_DONE', to: 'TTS_RUNNING', trigger: 'user_action' },
    { from: 'SCRIPT_DONE', to: 'TTS_RUNNING', trigger: 'auto_advance' },
    { from: 'TTS_RUNNING', to: 'TTS_DONE', trigger: 'step_complete' },
    { from: 'TTS_DONE', to: 'RENDER_READY', trigger: 'step_complete' },
    { from: 'TTS_DONE', to: 'RENDER_RUNNING', trigger: 'auto_advance' },
    { from: 'RENDER_READY', to: 'RENDER_RUNNING', trigger: 'user_action' },
    { from: 'RENDER_RUNNING', to: 'DONE', trigger: 'step_complete' },
    { from: 'SCRIPTING', to: 'FAILED', trigger: 'error' },
    { from: 'TTS_RUNNING', to: 'FAILED', trigger: 'error' },
    { from: 'RENDER_RUNNING', to: 'FAILED', trigger: 'error' },
    { from: 'SCRIPTING', to: 'CANCELLED', trigger: 'cancel' },
    { from: 'TTS_RUNNING', to: 'CANCELLED', trigger: 'cancel' },
    { from: 'RENDER_RUNNING', to: 'CANCELLED', trigger: 'cancel' },
    { from: 'FAILED', to: 'SCRIPTING', trigger: 'user_action' },
    { from: 'FAILED', to: 'TTS_RUNNING', trigger: 'user_action' },
    { from: 'FAILED', to: 'RENDER_RUNNING', trigger: 'user_action' },
    { from: 'CANCELLED', to: 'SCRIPTING', trigger: 'user_action' },
    { from: 'CANCELLED', to: 'TTS_RUNNING', trigger: 'user_action' },
    { from: 'CANCELLED', to: 'RENDER_RUNNING', trigger: 'user_action' },
];

export const COLUMN_TARGET_STEP: Record<BoardColumn, string> = {
    A_FAZER: '',
    ROTEIRO: 'roteiro',
    NARRACAO: 'tts',
    VIDEO: 'export',
    CONCLUIDO: '',
};

export function getColumnForState(state: JobState): BoardColumn {
    for (const [column, states] of Object.entries(COLUMN_STATES)) {
        if (states.includes(state)) {
            return column as BoardColumn;
        }
    }
    return 'A_FAZER';
}

export function canTransition(from: JobState, to: JobState): boolean {
    return ALLOWED_TRANSITIONS.some(t => t.from === from && t.to === to);
}

export function canMoveToColumn(currentState: JobState, targetColumn: BoardColumn): boolean {
    const currentColumn = getColumnForState(currentState);
    const columnOrder: BoardColumn[] = ['A_FAZER', 'ROTEIRO', 'NARRACAO', 'VIDEO', 'CONCLUIDO'];
    const currentIndex = columnOrder.indexOf(currentColumn);
    const targetIndex = columnOrder.indexOf(targetColumn);

    if (targetIndex <= currentIndex) return false;
    if (targetIndex > currentIndex + 1) return false;
    if (targetColumn === 'CONCLUIDO') return false;
    if (currentState.endsWith('_RUNNING') || currentState === 'SCRIPTING') return false;

    return true;
}

export function getTargetStepForColumn(column: BoardColumn): string {
    return COLUMN_TARGET_STEP[column];
}

export function isRunningState(state: JobState): boolean {
    return state.endsWith('_RUNNING') || state === 'SCRIPTING';
}

export function isEditableState(state: JobState): boolean {
    return ['DRAFT', 'READY', 'SCRIPT_DONE', 'TTS_DONE', 'RENDER_READY'].includes(state);
}

export function getNextState(currentState: JobState, autoVideoEnabled: boolean): JobState | null {
    switch (currentState) {
        case 'SCRIPTING': return 'SCRIPT_DONE';
        case 'SCRIPT_DONE': return 'TTS_RUNNING';
        case 'TTS_RUNNING': return 'TTS_DONE';
        case 'TTS_DONE': return autoVideoEnabled ? 'RENDER_RUNNING' : 'RENDER_READY';
        case 'RENDER_RUNNING': return 'DONE';
        default: return null;
    }
}

export function getRetryState(failedStep: string): JobState {
    const stepToState: Record<string, JobState> = {
        ideacao: 'SCRIPTING',
        titulo: 'SCRIPTING',
        brief: 'SCRIPTING',
        planejamento: 'SCRIPTING',
        roteiro: 'SCRIPTING',
        prompts_cenas: 'TTS_RUNNING',
        gerar_imagens: 'TTS_RUNNING',
        tts: 'TTS_RUNNING',
        render: 'RENDER_RUNNING',
        export: 'RENDER_RUNNING',
    };
    return stepToState[failedStep] || 'READY';
}

export function formatStateForUI(state: JobState): string {
    const labels: Record<JobState, string> = {
        DRAFT: 'Rascunho',
        READY: 'Pronto',
        SCRIPTING: 'Gerando roteiro...',
        SCRIPT_DONE: 'Roteiro pronto',
        TTS_RUNNING: 'Gerando narração...',
        TTS_DONE: 'Narração pronta',
        RENDER_READY: 'Aguardando render',
        RENDER_RUNNING: 'Renderizando...',
        DONE: 'Concluído',
        FAILED: 'Erro',
        CANCELLED: 'Cancelado',
    };
    return labels[state];
}

export function formatColumnForUI(column: BoardColumn): string {
    const labels: Record<BoardColumn, string> = {
        A_FAZER: 'Vídeos a Fazer',
        ROTEIRO: 'Gerar Roteiro',
        NARRACAO: 'Gerar Narração',
        VIDEO: 'Gerar Vídeo',
        CONCLUIDO: 'Concluído',
    };
    return labels[column];
}
