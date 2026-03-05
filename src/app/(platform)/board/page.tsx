"use client";

import { useState } from "react";
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
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "@/components/board/BoardColumn";
import { BoardCard } from "@/components/board/BoardCard";
import { NewVideoDialog } from "@/components/board/NewVideoDialog";
import type { Job, Column, JobState } from "./types";
import type { NewVideoFormData } from "@/components/board/NewVideoDialog";

const COLUMNS: Column[] = [
  { id: "col-todo", label: "A Fazer", states: ["DRAFT", "READY", "FAILED", "CANCELLED"] },
  { id: "col-script", label: "Roteiro", states: ["SCRIPTING"] },
  { id: "col-narration", label: "Narracao", states: ["SCRIPT_DONE", "TTS_RUNNING", "TTS_DONE"] },
  { id: "col-video", label: "Video", states: ["RENDER_READY", "RENDER_RUNNING"] },
  { id: "col-done", label: "Concluido", states: ["DONE"] },
];

const MOCK_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Como criar um site do zero com Next.js 14",
    state: "DRAFT",
    progress: 0,
    recipe_key: "video-completo",
    language: "pt-BR",
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "job-2",
    title: "Guia completo de Tailwind CSS para iniciantes",
    state: "SCRIPTING",
    progress: 35,
    recipe_key: "video-completo",
    language: "pt-BR",
    created_at: "2026-03-02T14:30:00Z",
    started_at: "2026-03-02T15:00:00Z",
  },
  {
    id: "job-3",
    title: "Top 10 ferramentas de IA para desenvolvedores em 2026",
    state: "TTS_RUNNING",
    progress: 72,
    recipe_key: "video-curto",
    language: "es-ES",
    created_at: "2026-03-03T09:00:00Z",
    started_at: "2026-03-03T09:30:00Z",
  },
  {
    id: "job-4",
    title: "React vs Vue em 2026: qual escolher?",
    state: "DONE",
    progress: 100,
    recipe_key: "video-completo",
    language: "en-US",
    created_at: "2026-03-04T08:00:00Z",
    started_at: "2026-03-04T08:15:00Z",
    completed_at: "2026-03-04T11:45:00Z",
  },
];

function findColumnForJob(jobId: string, jobs: Job[]): string | null {
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return null;
  const col = COLUMNS.find((c) => c.states.includes(job.state));
  return col?.id ?? null;
}

export default function BoardPage() {
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function getJobsForColumn(col: Column): Job[] {
    return jobs.filter((j) => col.states.includes(j.state));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeColId = findColumnForJob(activeId, jobs);
    const overColId = COLUMNS.find((c) => c.id === overId)?.id
      ?? findColumnForJob(overId, jobs);

    if (!activeColId || !overColId || activeColId === overColId) return;

    const targetCol = COLUMNS.find((c) => c.id === overColId);
    if (!targetCol) return;

    const newState = targetCol.states[0] as JobState;

    setJobs((prev) =>
      prev.map((j) => (j.id === activeId ? { ...j, state: newState } : j))
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveJobId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setJobs((prev) => {
      const oldIndex = prev.findIndex((j) => j.id === activeId);
      const newIndex = prev.findIndex((j) => j.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleNewVideo(data: NewVideoFormData) {
    const newJob: Job = {
      id: `job-${Date.now()}`,
      title: data.title,
      state: "DRAFT",
      progress: 0,
      recipe_key: data.recipe_key,
      language: data.language,
      created_at: new Date().toISOString(),
    };
    setJobs((prev) => [newJob, ...prev]);
  }

  const activeJob = jobs.find((j) => j.id === activeJobId) ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Production Board</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{jobs.length} videos no pipeline</p>
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
