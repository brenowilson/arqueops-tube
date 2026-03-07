/**
 * Timeline DSL Validator
 *
 * Validação Zod para Timeline DSL.
 * Garante integridade estrutural e regras de negócio.
 *
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

import { z } from 'zod';
import type { Timeline, Scene, Element } from './schema';

// ===========================================
// ZOD SCHEMAS
// ===========================================

export const ElementPropsSchema = z.object({
    // Video/Image
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    scale: z.number().min(0).max(10).optional(),
    opacity: z.number().min(0).max(1).optional(),

    // Audio
    volume: z.number().min(0).max(1).optional(),
    fadeIn: z.number().min(0).optional(),
    fadeOut: z.number().min(0).optional(),

    // Text
    content: z.string().optional(),
    font: z.string().optional(),
    fontSize: z.number().positive().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),

    // Subtitle
    srtPath: z.string().optional(),
    assPath: z.string().optional(),
    style: z.enum(['default', 'shorts', 'custom']).optional(),
}).passthrough();

export const ElementSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['video', 'audio', 'image', 'text', 'subtitle']),
    layer: z.number().int().min(0),
    start: z.number().min(0),
    duration: z.number().positive(),
    src: z.string().optional(),
    props: ElementPropsSchema,
});

export const SceneSchema = z.object({
    id: z.string().min(1),
    start: z.number().min(0),
    duration: z.number().positive(),
    elements: z.array(ElementSchema),
});

export const TimelineSettingsSchema = z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const TimelineSchema = z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    settings: TimelineSettingsSchema,
    scenes: z.array(SceneSchema),
});

// ===========================================
// VALIDATION RESULT
// ===========================================

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    path: string;
    message: string;
    code: string;
}

export interface ValidationWarning {
    path: string;
    message: string;
    code: string;
}

// ===========================================
// VALIDATOR FUNCTION
// ===========================================

/**
 * Valida uma Timeline completa
 *
 * @param timeline - Timeline para validar
 * @returns Resultado da validação com erros e warnings
 */
export function validateTimeline(timeline: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Validação estrutural com Zod
    const parseResult = TimelineSchema.safeParse(timeline);

    if (!parseResult.success) {
        for (const issue of parseResult.error.issues) {
            errors.push({
                path: issue.path.join('.'),
                message: issue.message,
                code: 'SCHEMA_INVALID',
            });
        }
        return { valid: false, errors, warnings };
    }

    const validTimeline = parseResult.data;

    // 2. Validações de negócio

    // 2.1 Timeline vazia
    if (validTimeline.scenes.length === 0) {
        warnings.push({
            path: 'scenes',
            message: 'Timeline não tem cenas',
            code: 'EMPTY_TIMELINE',
        });
    }

    // 2.2 Verificar overlaps de cenas
    const sortedScenes = [...validTimeline.scenes].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sortedScenes.length - 1; i++) {
        const current = sortedScenes[i];
        const next = sortedScenes[i + 1];
        const currentEnd = current.start + current.duration;

        if (currentEnd > next.start) {
            warnings.push({
                path: `scenes[${i}]`,
                message: `Cena "${current.id}" sobrepõe "${next.id}"`,
                code: 'SCENE_OVERLAP',
            });
        }
    }

    // 2.3 Verificar elementos sem src quando necessário
    for (const scene of validTimeline.scenes) {
        for (const element of scene.elements) {
            if (['video', 'audio', 'image'].includes(element.type) && !element.src) {
                errors.push({
                    path: `scenes.${scene.id}.elements.${element.id}`,
                    message: `Elemento ${element.type} "${element.id}" precisa de src`,
                    code: 'MISSING_SRC',
                });
            }

            if (element.type === 'subtitle' && !element.props.srtPath && !element.props.assPath) {
                errors.push({
                    path: `scenes.${scene.id}.elements.${element.id}`,
                    message: `Elemento subtitle "${element.id}" precisa de srtPath ou assPath`,
                    code: 'MISSING_SUBTITLE_PATH',
                });
            }
        }
    }

    // 2.4 Verificar elementos que excedem duração da cena
    for (const scene of validTimeline.scenes) {
        for (const element of scene.elements) {
            const elementEnd = element.start + element.duration;
            if (elementEnd > scene.duration) {
                warnings.push({
                    path: `scenes.${scene.id}.elements.${element.id}`,
                    message: `Elemento "${element.id}" excede duração da cena`,
                    code: 'ELEMENT_EXCEEDS_SCENE',
                });
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Valida e retorna timeline tipada ou lança erro
 */
export function parseTimelineOrThrow(timeline: unknown): Timeline {
    const result = validateTimeline(timeline);

    if (!result.valid) {
        const errorMessages = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
        throw new Error(`Timeline inválida:\n${errorMessages}`);
    }

    return timeline as Timeline;
}
