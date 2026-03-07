import { createServiceClient } from "@/lib/supabase/server";
import { executeLLM } from "./executors/llm";
import { executeTransform } from "./executors/transform";
import { executeTTS } from "./executors/tts";
import { executeImage } from "./executors/image";
import { executeRender } from "./executors/render";
import type { RecipeStep, ExecutionContext, StepResult } from "./types";

const supabase = createServiceClient();

type JobState =
  | "DRAFT" | "READY" | "SCRIPTING" | "SCRIPT_DONE"
  | "TTS_RUNNING" | "TTS_DONE" | "RENDER_READY" | "RENDER_RUNNING"
  | "DONE" | "FAILED" | "CANCELLED";

const STEP_TO_STATE: Record<string, { running: JobState; done: JobState }> = {
  ideacao: { running: "SCRIPTING", done: "SCRIPTING" },
  titulo: { running: "SCRIPTING", done: "SCRIPTING" },
  brief: { running: "SCRIPTING", done: "SCRIPTING" },
  planejamento: { running: "SCRIPTING", done: "SCRIPTING" },
  roteiro: { running: "SCRIPTING", done: "SCRIPT_DONE" },
  prompts_cenas: { running: "SCRIPT_DONE", done: "SCRIPT_DONE" },
  gerar_imagens: { running: "SCRIPT_DONE", done: "SCRIPT_DONE" },
  parse_ssml: { running: "TTS_RUNNING", done: "TTS_RUNNING" },
  tts: { running: "TTS_RUNNING", done: "TTS_DONE" },
  render: { running: "RENDER_RUNNING", done: "RENDER_RUNNING" },
  miniaturas: { running: "RENDER_RUNNING", done: "RENDER_RUNNING" },
  export: { running: "RENDER_RUNNING", done: "DONE" },
};

const EXECUTOR_MAP: Record<string, (ctx: ExecutionContext) => Promise<StepResult>> = {
  llm: executeLLM,
  tts: executeTTS,
  image: executeImage,
  render: executeRender,
  transform: executeTransform,
};

async function emitEvent(jobId: string, type: string, data: Record<string, unknown>) {
  await supabase.from("job_events").insert({ job_id: jobId, type, data });
}

async function updateJobState(jobId: string, state: JobState, progress: number) {
  const updates: Record<string, unknown> = { state, progress };
  if (state === "DONE") updates.completed_at = new Date().toISOString();
  if (state === "SCRIPTING" || state === "TTS_RUNNING" || state === "RENDER_RUNNING") {
    updates.started_at = new Date().toISOString();
  }
  await supabase.from("jobs").update(updates).eq("id", jobId);
}

/**
 * Run all steps of a job's recipe sequentially.
 * Updates job state, job_steps, and job_events in real-time.
 */
export async function runJob(jobId: string): Promise<void> {
  // Load job
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) throw new Error(`Job not found: ${jobId}`);
  if (job.state === "DONE" || job.state === "CANCELLED") return;

  // Load recipe
  const { data: recipe, error: recipeErr } = await supabase
    .from("recipes")
    .select("steps")
    .eq("key", job.recipe_key)
    .single();

  if (recipeErr || !recipe) throw new Error(`Recipe not found: ${job.recipe_key}`);

  const steps: RecipeStep[] = recipe.steps as RecipeStep[];

  // Generate manifest (config snapshot)
  const manifest = {
    job_id: jobId,
    recipe_key: job.recipe_key,
    language: job.language,
    steps: steps.map((s) => s.key),
    started_at: new Date().toISOString(),
  };
  await supabase.from("jobs").update({ manifest }).eq("id", jobId);

  await emitEvent(jobId, "state_changed", { from: job.state, to: "SCRIPTING", action: "auto_execute" });
  await updateJobState(jobId, "SCRIPTING", 0);

  const previousOutputs: Record<string, string> = {};
  const totalSteps = steps.length;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Check if step already completed (checkpoint idempotency)
    const { data: existing } = await supabase
      .from("job_steps")
      .select("status, output")
      .eq("job_id", jobId)
      .eq("step_key", step.key)
      .single();

    if (existing?.status === "completed" && existing.output) {
      previousOutputs[step.key] = (existing.output as { text: string }).text || "";
      continue;
    }

    // Create or update job_step
    await supabase.from("job_steps").upsert(
      {
        job_id: jobId,
        step_key: step.key,
        status: "running",
        started_at: new Date().toISOString(),
      },
      { onConflict: "job_id,step_key" },
    );

    await emitEvent(jobId, "step_started", { step_key: step.key, step_type: step.type, label: step.label });

    // Update job state based on current step
    const stateMapping = STEP_TO_STATE[step.key];
    if (stateMapping) {
      await updateJobState(jobId, stateMapping.running, Math.round(((i) / totalSteps) * 100));
    }

    // Execute step
    const executor = EXECUTOR_MAP[step.type];
    if (!executor) {
      await supabase
        .from("job_steps")
        .update({ status: "failed", error: `No executor for type: ${step.type}` })
        .eq("job_id", jobId)
        .eq("step_key", step.key);
      continue;
    }

    const ctx: ExecutionContext = {
      jobId,
      stepKey: step.key,
      language: job.language,
      input: { topic: job.input?.topic, title: job.title },
      previousOutputs,
    };

    try {
      const result = await executor(ctx);

      previousOutputs[step.key] = result.output;

      await supabase
        .from("job_steps")
        .update({
          status: "completed",
          output: { text: result.output, usage: result.usage },
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", jobId)
        .eq("step_key", step.key);

      // Save artifacts if any
      if (result.artifacts?.length) {
        for (const artifact of result.artifacts) {
          await supabase.from("artifacts").insert({
            job_id: jobId,
            step_key: step.key,
            path: artifact.path,
            mime_type: artifact.mime_type,
            file_size: artifact.size,
          });
        }
      }

      await emitEvent(jobId, "step_completed", {
        step_key: step.key,
        duration_ms: result.duration_ms,
        usage: result.usage,
        output_length: result.output.length,
      });

      // Update progress
      const progress = Math.round(((i + 1) / totalSteps) * 100);
      if (stateMapping) {
        await updateJobState(jobId, stateMapping.done, progress);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      await supabase
        .from("job_steps")
        .update({
          status: "failed",
          error: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", jobId)
        .eq("step_key", step.key);

      await emitEvent(jobId, "step_failed", { step_key: step.key, error: errorMsg });
      await updateJobState(jobId, "FAILED", Math.round(((i) / totalSteps) * 100));
      await supabase.from("jobs").update({ error_message: `Step ${step.key} failed: ${errorMsg}` }).eq("id", jobId);

      return; // Stop pipeline on failure
    }
  }

  // All steps completed
  await updateJobState(jobId, "DONE", 100);
  await emitEvent(jobId, "state_changed", { from: "RENDER_RUNNING", to: "DONE", action: "pipeline_complete" });
}
