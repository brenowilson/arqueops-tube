"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { JobState } from "./types";

const supabase = createServiceClient();

const STATE_TRANSITIONS: Record<string, JobState> = {
  "col-todo": "READY",
  "col-script": "SCRIPTING",
  "col-narration": "TTS_RUNNING",
  "col-video": "RENDER_READY",
  "col-done": "DONE",
};

export async function fetchJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from("recipes")
    .select("key, name")
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return data;
}

export async function createJob(input: {
  title: string;
  topic: string;
  language: string;
  recipe_key: string;
}) {
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title: input.title,
      recipe_key: input.recipe_key,
      language: input.language,
      input: { topic: input.topic },
      state: "DRAFT",
      progress: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("job_events").insert({
    job_id: data.id,
    type: "state_changed",
    data: { from: null, to: "DRAFT", action: "created" },
  });

  revalidatePath("/board");
  return data;
}

export async function executeJob(jobId: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${origin}/api/jobs/${jobId}/execute`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start execution");
  return res.json();
}

export async function createAndExecuteJob(input: {
  title: string;
  topic: string;
  language: string;
  recipe_key: string;
}) {
  const job = await createJob(input);
  // Trigger execution in background
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  fetch(`${origin}/api/jobs/${job.id}/execute`, { method: "POST" }).catch(console.error);
  return job;
}

export async function moveJob(jobId: string, targetColumnId: string) {
  const newState = STATE_TRANSITIONS[targetColumnId];
  if (!newState) throw new Error(`Invalid column: ${targetColumnId}`);

  const { data: current } = await supabase
    .from("jobs")
    .select("state")
    .eq("id", jobId)
    .single();

  if (!current) throw new Error("Job not found");
  if (current.state === newState) return current;

  const updates: Record<string, unknown> = { state: newState };

  if (newState === "SCRIPTING" || newState === "TTS_RUNNING" || newState === "RENDER_READY") {
    if (!current.state.includes("RUNNING")) {
      updates.started_at = new Date().toISOString();
    }
  }

  if (newState === "DONE") {
    updates.completed_at = new Date().toISOString();
    updates.progress = 100;
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", jobId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("job_events").insert({
    job_id: jobId,
    type: "state_changed",
    data: { from: current.state, to: newState, action: "drag_move" },
  });

  revalidatePath("/board");
  return data;
}

export async function deleteJob(jobId: string) {
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath("/board");
}

export async function fetchJobSteps(jobId: string) {
  const { data, error } = await supabase
    .from("job_steps")
    .select("*")
    .eq("job_id", jobId)
    .order("started_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchJobEvents(jobId: string) {
  const { data, error } = await supabase
    .from("job_events")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data;
}
