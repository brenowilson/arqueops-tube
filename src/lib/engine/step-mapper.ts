/**
 * Step Key Mapper - Support for PT-BR and EN step keys
 * Ported from Video Factory OS
 */

const STEP_ALIASES: Record<string, string[]> = {
    'ideacao': ['ideation'],
    'titulo': ['title'],
    'planejamento': ['planning', 'brief'],
    'roteiro': ['script'],
    'miniaturas': ['thumbnails'],
    'descricao': ['description'],
    'tags': ['tags'],
    'comunidade': ['community'],
    'parse_ssml': ['parse_ssml'],
    'tts': ['tts'],
    'renderizacao': ['render'],
    'exportacao': ['export'],
};

const ALIAS_TO_CANONICAL: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(STEP_ALIASES)) {
    ALIAS_TO_CANONICAL[canonical] = canonical;
    for (const alias of aliases) {
        ALIAS_TO_CANONICAL[alias] = canonical;
    }
}

export function normalizeStepKey(key: string): string {
    const lower = key.toLowerCase().trim();
    return ALIAS_TO_CANONICAL[lower] || lower;
}

export function getStepExecutorType(key: string): 'llm' | 'tts' | 'transform' | 'render' | 'export' | 'unknown' {
    const normalized = normalizeStepKey(key);

    const EXECUTOR_MAP: Record<string, 'llm' | 'tts' | 'transform' | 'render' | 'export'> = {
        'ideacao': 'llm',
        'titulo': 'llm',
        'planejamento': 'llm',
        'roteiro': 'llm',
        'miniaturas': 'llm',
        'descricao': 'llm',
        'tags': 'llm',
        'comunidade': 'llm',
        'parse_ssml': 'transform',
        'tts': 'tts',
        'renderizacao': 'render',
        'exportacao': 'export',
    };

    return EXECUTOR_MAP[normalized] || 'unknown';
}

export function isValidStepKey(key: string): boolean {
    return normalizeStepKey(key) in STEP_ALIASES || key in ALIAS_TO_CANONICAL;
}

export function getAllCanonicalStepKeys(): string[] {
    return Object.keys(STEP_ALIASES);
}

export function getPreviousOutputKey(
    previousOutputs: Record<string, unknown>,
    stepKey: string
): unknown {
    const normalized = normalizeStepKey(stepKey);

    if (previousOutputs[normalized] !== undefined) {
        return previousOutputs[normalized];
    }

    const aliases = STEP_ALIASES[normalized] || [];
    for (const alias of aliases) {
        if (previousOutputs[alias] !== undefined) {
            return previousOutputs[alias];
        }
    }

    return previousOutputs[stepKey];
}
