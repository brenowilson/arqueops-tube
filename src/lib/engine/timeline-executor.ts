/**
 * Timeline Executor
 * 
 * Executa um RenderPlan gerado pelo Compiler.
 * Cada RenderStep é um comando FFmpeg que é executado em ordem.
 * 
 * @see docs/01-adr/2025-12-22-adr-013-timeline-dsl-renderplan.md
 */

// child_process.exec é usado via require dentro de executeCommand
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import {
    RenderPlan,
    RenderStep,
    RenderPlanExecution,
    StepExecutionResult,
    sortStepsByDependencies,
    validateRenderPlan,
} from '@/lib/timeline';

// ===========================================
// EXECUTOR OPTIONS
// ===========================================

export interface ExecutorOptions {
    /** Timeout for each step in milliseconds */
    stepTimeoutMs?: number;
    /** Callback for progress updates */
    onProgress?: (stepId: string, progress: number) => void;
    /** Callback for logs */
    onLog?: (stepId: string, message: string) => void;
    /** Dry run (don't execute, just log commands) */
    dryRun?: boolean;
}

const DEFAULT_OPTIONS: Required<ExecutorOptions> = {
    stepTimeoutMs: 5 * 60 * 1000, // 5 minutes
    onProgress: () => { },
    onLog: () => { },
    dryRun: false,
};

// ===========================================
// MAIN EXECUTOR
// ===========================================

/**
 * Execute a RenderPlan
 */
export async function executeRenderPlan(
    plan: RenderPlan,
    options: ExecutorOptions = {}
): Promise<RenderPlanExecution> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startedAt = new Date().toISOString();

    // Validate plan
    const validation = validateRenderPlan(plan);
    if (!validation.valid) {
        return {
            planId: plan.jobId,
            jobId: plan.jobId,
            status: 'failed',
            startedAt,
            completedAt: new Date().toISOString(),
            stepResults: [{
                stepId: 'validation',
                status: 'failed',
                startedAt,
                completedAt: new Date().toISOString(),
                error: {
                    code: 'VALIDATION_FAILED',
                    message: validation.errors.join('; '),
                },
                logs: validation.errors,
            }],
        };
    }

    // Sort steps by dependencies
    const sortedSteps = sortStepsByDependencies(plan.steps);

    const execution: RenderPlanExecution = {
        planId: plan.jobId,
        jobId: plan.jobId,
        status: 'running',
        startedAt,
        stepResults: [],
    };

    // Execute steps in order
    for (const step of sortedSteps) {
        execution.currentStepId = step.id;
        opts.onProgress(step.id, 0);

        const result = await executeRenderStep(step, opts);
        execution.stepResults.push(result);

        if (result.status === 'failed') {
            execution.status = 'failed';
            execution.completedAt = new Date().toISOString();
            return execution;
        }

        opts.onProgress(step.id, 100);
    }

    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.finalOutputPath = plan.finalOutput;

    return execution;
}

/**
 * Execute a single RenderStep (FFmpeg command)
 */
export async function executeRenderStep(
    step: RenderStep,
    options: ExecutorOptions = {}
): Promise<StepExecutionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startedAt = new Date().toISOString();
    const logs: string[] = [];

    logs.push(`[${step.type}] ${step.metadata.description}`);
    logs.push(`Command: ${step.command}`);

    // Ensure output directory exists
    const outputDir = path.dirname(step.output);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
        logs.push(`Created directory: ${outputDir}`);
    }

    // Check inputs exist
    for (const input of step.inputs) {
        if (!existsSync(input)) {
            return {
                stepId: step.id,
                status: 'failed',
                startedAt,
                completedAt: new Date().toISOString(),
                error: {
                    code: 'INPUT_NOT_FOUND',
                    message: `Input file not found: ${input}`,
                },
                logs,
            };
        }
    }

    // Dry run - just log
    if (opts.dryRun) {
        logs.push('[DRY RUN] Would execute command');
        return {
            stepId: step.id,
            status: 'success',
            startedAt,
            completedAt: new Date().toISOString(),
            outputPath: step.output,
            logs,
        };
    }

    // Execute FFmpeg command
    try {
        const { stdout, stderr, exitCode } = await executeCommand(step.command, opts.stepTimeoutMs);

        logs.push(`stdout: ${stdout.slice(-500)}`);
        if (stderr) logs.push(`stderr: ${stderr.slice(-500)}`);

        if (exitCode !== 0) {
            return {
                stepId: step.id,
                status: 'failed',
                startedAt,
                completedAt: new Date().toISOString(),
                error: {
                    code: 'FFMPEG_ERROR',
                    message: `FFmpeg exited with code ${exitCode}`,
                    stack: stderr,
                },
                logs,
            };
        }

        // Verify output was created
        if (!existsSync(step.output)) {
            return {
                stepId: step.id,
                status: 'failed',
                startedAt,
                completedAt: new Date().toISOString(),
                error: {
                    code: 'OUTPUT_NOT_CREATED',
                    message: `Output file was not created: ${step.output}`,
                },
                logs,
            };
        }

        logs.push(`Output created: ${step.output}`);

        return {
            stepId: step.id,
            status: 'success',
            startedAt,
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - new Date(startedAt).getTime(),
            outputPath: step.output,
            logs,
        };

    } catch (err) {
        const error = err as Error;
        return {
            stepId: step.id,
            status: 'failed',
            startedAt,
            completedAt: new Date().toISOString(),
            error: {
                code: 'EXECUTION_ERROR',
                message: error.message,
                stack: error.stack,
            },
            logs,
        };
    }
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Execute a shell command using exec (simpler API)
 */
function executeCommand(
    command: string,
    timeoutMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const { exec } = require('child_process');

        exec(command, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
                // Check if it's an ExecException with a code property
                const exitCode = (error as NodeJS.ErrnoException).code
                    ? 1
                    : ((error as { code?: number }).code ?? 1);
                resolve({
                    stdout: stdout || '',
                    stderr: stderr || error.message,
                    exitCode: typeof exitCode === 'number' ? exitCode : 1,
                });
                return;
            }
            resolve({
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0,
            });
        });
    });
}

/**
 * Get execution summary for logging
 */
export function getExecutionSummary(execution: RenderPlanExecution): string {
    const completed = execution.stepResults.filter(r => r.status === 'success').length;
    const failed = execution.stepResults.filter(r => r.status === 'failed').length;
    const total = execution.stepResults.length;

    return `RenderPlan ${execution.planId}: ${execution.status} (${completed}/${total} steps, ${failed} failed)`;
}
