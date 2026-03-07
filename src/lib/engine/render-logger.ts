/**
 * Render Logger
 * 
 * Logs estruturados para rastreabilidade de render jobs.
 * Suporta múltiplos sinks (console, file, DB).
 * 
 * Gate 2.5: Artefacts + Logs estruturados
 * 
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs';
import path from 'path';

// ===========================================
// LOG TYPES
// ===========================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RenderLogEntry {
    timestamp: string;
    level: LogLevel;
    jobId: string;
    stepId?: string;
    message: string;
    duration_ms?: number;
    metadata?: Record<string, unknown>;
}

export interface RenderLogSummary {
    jobId: string;
    startedAt: string;
    completedAt?: string;
    status: 'running' | 'completed' | 'failed';
    totalDurationMs?: number;
    stepCount: number;
    errorCount: number;
    entries: RenderLogEntry[];
}

export interface LogSink {
    write(entry: RenderLogEntry): void;
    flush?(): void;
}

// ===========================================
// LOG SINKS
// ===========================================

/**
 * Console log sink
 */
export class ConsoleSink implements LogSink {
    private colors: Record<LogLevel, string> = {
        debug: '\x1b[90m', // gray
        info: '\x1b[36m',  // cyan
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
    };
    private reset = '\x1b[0m';

    write(entry: RenderLogEntry): void {
        const color = this.colors[entry.level];
        const prefix = entry.stepId ? `[${entry.jobId}:${entry.stepId}]` : `[${entry.jobId}]`;
        const duration = entry.duration_ms ? ` (${entry.duration_ms}ms)` : '';

        console.log(
            `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}${this.reset} ${prefix} ${entry.message}${duration}`
        );
    }
}

/**
 * File log sink (JSONL format)
 */
export class FileSink implements LogSink {
    private basePath: string;
    private buffer: RenderLogEntry[] = [];
    private bufferSize: number;

    constructor(basePath: string, bufferSize: number = 10) {
        this.basePath = basePath;
        this.bufferSize = bufferSize;

        // Ensure directory exists
        if (!existsSync(basePath)) {
            mkdirSync(basePath, { recursive: true });
        }
    }

    write(entry: RenderLogEntry): void {
        this.buffer.push(entry);

        if (this.buffer.length >= this.bufferSize) {
            this.flush();
        }
    }

    flush(): void {
        if (this.buffer.length === 0) return;

        // Group by jobId
        const byJob = new Map<string, RenderLogEntry[]>();

        for (const entry of this.buffer) {
            const existing = byJob.get(entry.jobId) || [];
            existing.push(entry);
            byJob.set(entry.jobId, existing);
        }

        // Write to job-specific files
        Array.from(byJob.entries()).forEach(([jobId, entries]) => {
            const filePath = path.join(this.basePath, `${jobId}.jsonl`);
            const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
            appendFileSync(filePath, lines);
        });

        this.buffer = [];
    }
}

/**
 * Memory sink (for testing / in-memory access)
 */
export class MemorySink implements LogSink {
    private entries: RenderLogEntry[] = [];
    private maxEntries: number;

    constructor(maxEntries: number = 1000) {
        this.maxEntries = maxEntries;
    }

    write(entry: RenderLogEntry): void {
        this.entries.push(entry);

        // Keep only last N entries
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
    }

    getEntries(jobId?: string): RenderLogEntry[] {
        if (jobId) {
            return this.entries.filter(e => e.jobId === jobId);
        }
        return [...this.entries];
    }

    clear(): void {
        this.entries = [];
    }
}

// ===========================================
// RENDER LOGGER
// ===========================================

export class RenderLogger {
    private sinks: LogSink[] = [];
    private level: LogLevel = 'info';
    private summaries: Map<string, RenderLogSummary> = new Map();

    private levelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    constructor(sinks?: LogSink[], level?: LogLevel) {
        this.sinks = sinks || [new ConsoleSink()];
        this.level = level || 'info';
    }

    /** Add a sink */
    addSink(sink: LogSink): void {
        this.sinks.push(sink);
    }

    /** Set minimum log level */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /** Log a message */
    log(
        level: LogLevel,
        jobId: string,
        message: string,
        options?: { stepId?: string; durationMs?: number; metadata?: Record<string, unknown> }
    ): void {
        // Check level
        if (this.levelPriority[level] < this.levelPriority[this.level]) {
            return;
        }

        const entry: RenderLogEntry = {
            timestamp: new Date().toISOString(),
            level,
            jobId,
            stepId: options?.stepId,
            message,
            duration_ms: options?.durationMs,
            metadata: options?.metadata,
        };

        // Write to all sinks
        for (const sink of this.sinks) {
            sink.write(entry);
        }

        // Update summary
        this.updateSummary(entry);
    }

    /** Convenience methods */
    debug(jobId: string, message: string, options?: { stepId?: string; metadata?: Record<string, unknown> }): void {
        this.log('debug', jobId, message, options);
    }

    info(jobId: string, message: string, options?: { stepId?: string; durationMs?: number; metadata?: Record<string, unknown> }): void {
        this.log('info', jobId, message, options);
    }

    warn(jobId: string, message: string, options?: { stepId?: string; metadata?: Record<string, unknown> }): void {
        this.log('warn', jobId, message, options);
    }

    error(jobId: string, message: string, options?: { stepId?: string; metadata?: Record<string, unknown> }): void {
        this.log('error', jobId, message, options);
    }

    /** Start tracking a job */
    startJob(jobId: string): void {
        this.summaries.set(jobId, {
            jobId,
            startedAt: new Date().toISOString(),
            status: 'running',
            stepCount: 0,
            errorCount: 0,
            entries: [],
        });

        this.info(jobId, 'Job started');
    }

    /** End tracking a job */
    endJob(jobId: string, status: 'completed' | 'failed'): RenderLogSummary | undefined {
        const summary = this.summaries.get(jobId);
        if (!summary) return undefined;

        summary.completedAt = new Date().toISOString();
        summary.status = status;
        summary.totalDurationMs = new Date(summary.completedAt).getTime() - new Date(summary.startedAt).getTime();

        this.info(jobId, `Job ${status}`, { durationMs: summary.totalDurationMs });

        // Flush all sinks
        for (const sink of this.sinks) {
            sink.flush?.();
        }

        return summary;
    }

    /** Get summary for a job */
    getSummary(jobId: string): RenderLogSummary | undefined {
        return this.summaries.get(jobId);
    }

    /** Save summary to file */
    saveSummary(jobId: string, outputDir: string): string | null {
        const summary = this.summaries.get(jobId);
        if (!summary) return null;

        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        const filePath = path.join(outputDir, 'render-log.json');
        writeFileSync(filePath, JSON.stringify(summary, null, 2));

        return filePath;
    }

    /** Update summary with new entry */
    private updateSummary(entry: RenderLogEntry): void {
        const summary = this.summaries.get(entry.jobId);
        if (!summary) return;

        summary.entries.push(entry);

        if (entry.stepId && !summary.entries.some(e => e.stepId === entry.stepId && e !== entry)) {
            summary.stepCount++;
        }

        if (entry.level === 'error') {
            summary.errorCount++;
        }
    }
}

// ===========================================
// SINGLETON INSTANCE
// ===========================================

let loggerInstance: RenderLogger | null = null;

/**
 * Get or create the global render logger
 */
export function getRenderLogger(): RenderLogger {
    if (!loggerInstance) {
        const sinks: LogSink[] = [new ConsoleSink()];

        // Add file sink in production
        if (process.env.NODE_ENV === 'production') {
            const logsDir = path.join(process.cwd(), 'logs', 'render');
            sinks.push(new FileSink(logsDir));
        }

        loggerInstance = new RenderLogger(sinks);
    }
    return loggerInstance;
}

/**
 * Create a job-scoped logger
 */
export function createJobLogger(jobId: string): {
    debug: (message: string, options?: { stepId?: string }) => void;
    info: (message: string, options?: { stepId?: string; durationMs?: number }) => void;
    warn: (message: string, options?: { stepId?: string }) => void;
    error: (message: string, options?: { stepId?: string }) => void;
} {
    const logger = getRenderLogger();

    return {
        debug: (msg, opts) => logger.debug(jobId, msg, opts),
        info: (msg, opts) => logger.info(jobId, msg, opts),
        warn: (msg, opts) => logger.warn(jobId, msg, opts),
        error: (msg, opts) => logger.error(jobId, msg, opts),
    };
}
