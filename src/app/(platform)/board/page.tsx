"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { BoardColumn } from "@/components/board/BoardColumn";
import { BoardCard } from "@/components/board/BoardCard";
import { NewVideoDialog } from "@/components/board/NewVideoDialog";
import { createClient } from "@/lib/supabase/client";
import { fetchJobs, createJob, moveJob } from "./actions";
import type { Job, Column, JobState } from "./types";

const COLUMNS: Column[] = [
  { id: "col-todo", label: "A Fazer", states: ["DRAFT", "READY", "FAILED", "CANCELLED"] },
  { id: "col-script", label: "Roteiro", states: ["SCRIPTING", "SCRIPT_DONE"] },
  { id: "col-narration", label: "Narração", states: ["TTS_RUNNING", "TTS_DONE"] },
  { id: "col-video", label: "Vídeo", states: ["RENDER_READY", "RENDER_RUNNING"] },
  { id: "col-done", label: "Concluído", states: ["DONE"] },
];

function findColumnForState(state: JobState): string | null {
  return COLUMNS.find((c) => c.states.includes(state))?.id ?? null;
}

export default function BoardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const loadJobs = useCallback(async () => {
    try {
      const data = await fetchJobs();
      setJobs(data as Job[]);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();

    const supabase = createClient();
    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setJobs((prev) => [payload.new as Job, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setJobs((prev) =>
              prev.map((j) => (j.id === (payload.new as Job).id ? (payload.new as Job) : j)),
            );
          } else if (payload.eventType === "DELETE") {
            setJobs((prev) => prev.filter((j) => j.id !== (payload.old as { id: string }).id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadJobs]);

  function getJobsForColumn(col: Column): Job[] {
    return jobs.filter((j) => col.states.includes(j.state as JobState));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeJob = jobs.find((j) => j.id === activeId);
    if (!activeJob) return;

    const activeColId = findColumnForState(activeJob.state as JobState);
    const overColId =
      COLUMNS.find((c) => c.id === overId)?.id ?? findColumnForState(jobs.find((j) => j.id === overId)?.state as JobState);

    if (!activeColId || !overColId || activeColId === overColId) return;

    const targetCol = COLUMNS.find((c) => c.id === overColId);
    if (!targetCol) return;

    const newState = targetCol.states[0] as JobState;
    setJobs((prev) =>
      prev.map((j) => (j.id === activeId ? { ...j, state: newState } : j)),
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveJobId(null);
    if (!over) return;

    const activeId = active.id as string;
    const job = jobs.find((j) => j.id === activeId);
    if (!job) return;

    const targetColId =
      COLUMNS.find((c) => c.id === (over.id as string))?.id ??
      findColumnForState(jobs.find((j) => j.id === (over.id as string))?.state as JobState);

    if (!targetColId) return;

    try {
      await moveJob(activeId, targetColId);
    } catch (err) {
      console.error("Failed to move job:", err);
      loadJobs();
    }
  }

  async function handleNewVideo(data: { title: string; topic: string; language: string; recipe_key: string }) {
    try {
      await createJob(data);
    } catch (err) {
      console.error("Failed to create job:", err);
    }
  }

  const activeJob = jobs.find((j) => j.id === activeJobId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
          <p className="text-sm text-zinc-500">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Production Board</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {jobs.length} {jobs.length === 1 ? "vídeo" : "vídeos"} no pipeline
          </p>
        </div>
        <NewVideoDialog onCreated={handleNewVideo} />
      </div>

      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActiveJobId(e.active.id as string)}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 min-w-max">
            {COLUMNS.map((col) => (
              <BoardColumn key={col.id} column={col} jobs={getJobsForColumn(col)} />
            ))}
          </div>

          <DragOverlay>
            {activeJob ? <BoardCard job={activeJob} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
