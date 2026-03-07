/**
 * Render Worker
 * 
 * Worker local para execução de RenderPlans.
 * Processa jobs da queue de render com controle de concorrência.
 * 
 * Gate 2.2: Worker local (single Mac)
 * Gate 2.3: Queue + Status + Retry
 * 
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

import { EventEmitter } from 'events';
import { RenderPlan, RenderPlanExecution } from '@/lib/timeline';
import { executeRenderPlan, ExecutorOptions } from './timeline-executor';

// ===========================================
// WORKER TYPES
// ===========================================

export interface RenderJob {
    id: string;
    plan: RenderPlan;
    priority: number; // Higher = more priority
    createdAt: string;
    status: RenderJobStatus;
    attempt: number;
    maxAttempts: number;
    error?: string;
}

export type RenderJobStatus =
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface WorkerConfig {
    /** Max concurrent jobs */
    concurrency: number;
    /** Max retries per job */
    maxRetries: number;
    /** Delay between retries (ms) */
    retryDelayMs: number;
    /** Timeout per job (ms) */
    jobTimeoutMs: number;
}

export interface WorkerStatus {
    isRunning: boolean;
    activeJobs: number;
    queueLength: number;
    completedCount: number;
    failedCount: number;
}

// ===========================================
// RENDER QUEUE
// ===========================================

export class RenderQueue extends EventEmitter {
    private jobs: Map<string, RenderJob> = new Map();
    private queue: string[] = []; // Job IDs in order

    /** Add job to queue */
    enqueue(plan: RenderPlan, priority: number = 0): RenderJob {
        const job: RenderJob = {
            id: plan.jobId,
            plan,
            priority,
            createdAt: new Date().toISOString(),
            status: 'queued',
            attempt: 0,
            maxAttempts: 3,
        };

        this.jobs.set(job.id, job);
        this.insertByPriority(job.id, priority);
        this.emit('job:queued', job);

        return job;
    }

    /** Get next job from queue */
    dequeue(): RenderJob | null {
        const jobId = this.queue.shift();
        if (!jobId) return null;

        const job = this.jobs.get(jobId);
        if (!job) return null;

        job.status = 'processing';
        job.attempt++;
        this.emit('job:processing', job);

        return job;
    }

    /** Mark job as completed */
    complete(jobId: string, execution: RenderPlanExecution): void {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.status = 'completed';
        this.emit('job:completed', job, execution);
    }

    /** Mark job as failed (may retry) */
    fail(jobId: string, error: string): boolean {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        job.error = error;

        if (job.attempt < job.maxAttempts) {
            // Re-queue for retry
            job.status = 'queued';
            this.insertByPriority(jobId, job.priority);
            this.emit('job:retry', job);
            return true;
        }

        job.status = 'failed';
        this.emit('job:failed', job);
        return false;
    }

    /** Cancel a job */
    cancel(jobId: string): boolean {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        // Remove from queue if still queued
        const queueIndex = this.queue.indexOf(jobId);
        if (queueIndex !== -1) {
            this.queue.splice(queueIndex, 1);
        }

        job.status = 'cancelled';
        this.emit('job:cancelled', job);
        return true;
    }

    /** Get job by ID */
    getJob(jobId: string): RenderJob | undefined {
        return this.jobs.get(jobId);
    }

    /** Get queue status */
    getStatus(): { queued: number; processing: number; completed: number; failed: number } {
        let queued = 0, processing = 0, completed = 0, failed = 0;

        Array.from(this.jobs.values()).forEach((job) => {
            switch (job.status) {
                case 'queued': queued++; break;
                case 'processing': processing++; break;
                case 'completed': completed++; break;
                case 'failed': failed++; break;
            }
        });

        return { queued, processing, completed, failed };
    }

    /** Insert job ID maintaining priority order */
    private insertByPriority(jobId: string, priority: number): void {
        // Find position to insert (higher priority = earlier in queue)
        let insertIndex = this.queue.length;

        for (let i = 0; i < this.queue.length; i++) {
            const existingJob = this.jobs.get(this.queue[i]);
            if (existingJob && priority > existingJob.priority) {
                insertIndex = i;
                break;
            }
        }

        this.queue.splice(insertIndex, 0, jobId);
    }

    /** Get current queue length */
    get length(): number {
        return this.queue.length;
    }
}

// ===========================================
// RENDER WORKER
// ===========================================

export class RenderWorker extends EventEmitter {
    private config: WorkerConfig;
    private queue: RenderQueue;
    private running: boolean = false;
    private activeJobs: Set<string> = new Set();
    private completedCount: number = 0;
    private failedCount: number = 0;

    constructor(config: Partial<WorkerConfig> = {}) {
        super();

        this.config = {
            concurrency: config.concurrency ?? 1,
            maxRetries: config.maxRetries ?? 3,
            retryDelayMs: config.retryDelayMs ?? 5000,
            jobTimeoutMs: config.jobTimeoutMs ?? 10 * 60 * 1000, // 10 minutes
        };

        this.queue = new RenderQueue();

        // Forward queue events
        this.queue.on('job:queued', (job) => this.emit('job:queued', job));
        this.queue.on('job:processing', (job) => this.emit('job:processing', job));
        this.queue.on('job:completed', (job, exec) => {
            this.completedCount++;
            this.emit('job:completed', job, exec);
        });
        this.queue.on('job:failed', (job) => {
            this.failedCount++;
            this.emit('job:failed', job);
        });
        this.queue.on('job:retry', (job) => this.emit('job:retry', job));
    }

    /** Start the worker */
    start(): void {
        if (this.running) return;

        this.running = true;
        this.emit('worker:started');
        this.processLoop();
    }

    /** Stop the worker */
    stop(): void {
        this.running = false;
        this.emit('worker:stopped');
    }

    /** Submit a render plan to the queue */
    submit(plan: RenderPlan, priority: number = 0): RenderJob {
        const job = this.queue.enqueue(plan, priority);
        job.maxAttempts = this.config.maxRetries;

        // Start worker if not running
        if (!this.running) {
            this.start();
        }

        return job;
    }

    /** Cancel a job */
    cancel(jobId: string): boolean {
        return this.queue.cancel(jobId);
    }

    /** Get job status */
    getJob(jobId: string): RenderJob | undefined {
        return this.queue.getJob(jobId);
    }

    /** Get worker status */
    getStatus(): WorkerStatus {
        return {
            isRunning: this.running,
            activeJobs: this.activeJobs.size,
            queueLength: this.queue.length,
            completedCount: this.completedCount,
            failedCount: this.failedCount,
        };
    }

    /** Main processing loop */
    private async processLoop(): Promise<void> {
        while (this.running) {
            // Check if we can process more jobs
            if (this.activeJobs.size >= this.config.concurrency) {
                await this.sleep(100);
                continue;
            }

            // Get next job
            const job = this.queue.dequeue();
            if (!job) {
                await this.sleep(100);
                continue;
            }

            // Process job (don't await - run concurrently)
            this.processJob(job);
        }
    }

    /** Process a single job */
    private async processJob(job: RenderJob): Promise<void> {
        this.activeJobs.add(job.id);
        this.emit('job:started', job);

        const executorOptions: ExecutorOptions = {
            stepTimeoutMs: this.config.jobTimeoutMs,
            onProgress: (stepId, progress) => {
                this.emit('job:progress', job.id, stepId, progress);
            },
            onLog: (stepId, message) => {
                this.emit('job:log', job.id, stepId, message);
            },
        };

        try {
            const execution = await executeRenderPlan(job.plan, executorOptions);

            if (execution.status === 'completed') {
                this.queue.complete(job.id, execution);
            } else {
                const errorMsg = execution.stepResults
                    .find(r => r.status === 'failed')?.error?.message || 'Unknown error';

                const willRetry = this.queue.fail(job.id, errorMsg);

                if (willRetry) {
                    // Wait before retry
                    await this.sleep(this.config.retryDelayMs);
                }
            }
        } catch (err) {
            const error = err as Error;
            this.queue.fail(job.id, error.message);
        } finally {
            this.activeJobs.delete(job.id);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===========================================
// SINGLETON INSTANCE (persists through hot reloads)
// ===========================================

// Use globalThis to persist the worker instance in dev mode
// Next.js hot reloading would otherwise reset module-level vars
const globalForWorker = globalThis as unknown as {
    renderWorker: RenderWorker | undefined;
};

/**
 * Get or create the global render worker
 */
export function getRenderWorker(config?: Partial<WorkerConfig>): RenderWorker {
    if (!globalForWorker.renderWorker) {
        globalForWorker.renderWorker = new RenderWorker(config);
    }
    return globalForWorker.renderWorker;
}

/**
 * Submit a render plan to the global worker
 */
export function submitRenderJob(plan: RenderPlan, priority: number = 0): RenderJob {
    return getRenderWorker().submit(plan, priority);
}

