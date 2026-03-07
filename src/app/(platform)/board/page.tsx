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
import { toast } from "sonner";
import { BoardColumn } from "@/components/board/BoardColumn";
import { BoardCard } from "@/components/board/BoardCard";
import { BoardTopbar } from "@/components/board/BoardTopbar";
import { NewVideoDialog } from "@/components/board/NewVideoDialog";
import { JobDetailsDrawer } from "@/components/board/JobDetailsDrawer";
import { createClient } from "@/lib/supabase/client";
import { fetchJobs, createJob, createAndExecuteJob, moveJob, executeJob } from "./actions";
import {
  canMoveToColumn,
  isRunningState,
  type BoardColumn as BoardColumnType,
} from "@/lib/engine/job-state-machine";
import type { Job, Column, JobState } from "./types";

const COLUMNS: Column[] = [
  { id: "col-todo",      label: "A Fazer",   states: ["DRAFT", "READY", "FAILED", "CANCELLED"] },
  { id: "col-script",    label: "Roteiro",   states: ["SCRIPTING", "SCRIPT_DONE"] },
  { id: "col-narration", label: "Narração",  states: ["TTS_RUNNING", "TTS_DONE"] },
  { id: "col-video",     label: "Vídeo",     states: ["RENDER_READY", "RENDER_RUNNING"] },
  { id: "col-done",      label: "Concluído", states: ["DONE"] },
];

const COL_TO_BOARD: Record<string, BoardColumnType> = {
  "col-todo": "A_FAZER",
  "col-script": "ROTEIRO",
  "col-narration": "NARRACAO",
  "col-video": "VIDEO",
  "col-done": "CONCLUIDO",
};

function findColumnForState(state: JobState): string | null {
  return COLUMNS.find((c) => c.states.includes(state))?.id ?? null;
}

export default function BoardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newVideoOpen, setNewVideoOpen] = useState(false);
  const [autoVideo, setAutoVideo] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("autoVideo") === "true";
    }
    return false;
  });
  const [movingJobId, setMovingJobId] = useState<string | null>(null);

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
      COLUMNS.find((c) => c.id === overId)?.id ??
      findColumnForState(jobs.find((j) => j.id === overId)?.state as JobState);

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

    // Check source column — skip if same
    const sourceColId = findColumnForState(job.state as JobState);
    if (sourceColId === targetColId) return;

    // Validate using state machine
    const targetBoardCol = COL_TO_BOARD[targetColId];
    if (targetBoardCol && !canMoveToColumn(job.state, targetBoardCol)) {
      let message = "Movimento não permitido";
      if (targetBoardCol === "CONCLUIDO") {
        message = "Não é possível mover diretamente para Concluído";
      } else if (isRunningState(job.state)) {
        message = "Aguarde a execução terminar ou cancele o job";
      }
      toast.error("Movimento bloqueado", { description: message });
      loadJobs(); // Reset optimistic update
      return;
    }

    setMovingJobId(activeId);
    try {
      await moveJob(activeId, targetColId);
      toast.success("Execução iniciada", { description: `Job movido para ${targetBoardCol}` });
    } catch (err) {
      console.error("Failed to move job:", err);
      toast.error("Erro ao mover card", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
      loadJobs();
    } finally {
      setMovingJobId(null);
    }
  }

  async function handleNewVideo(data: { title: string; topic: string; language: string; recipe_key: string }) {
    try {
      if (autoVideo) {
        await createAndExecuteJob(data);
        toast.success("Vídeo criado!", { description: "Execução automática iniciada" });
      } else {
        await createJob(data);
        toast.success("Vídeo criado!", { description: "Card adicionado à coluna 'A Fazer'" });
      }
      setNewVideoOpen(false);
    } catch (err) {
      console.error("Failed to create job:", err);
      toast.error("Erro ao criar vídeo", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  async function handleExecute(jobId: string) {
    try {
      await executeJob(jobId);
      toast.success("Execução iniciada");
    } catch (err) {
      console.error("Failed to execute job:", err);
      toast.error("Erro ao executar", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  function handleSelectJob(job: Job) {
    setSelectedJobId(job.id);
    setDrawerOpen(true);
  }

  const activeJob = jobs.find((j) => j.id === activeJobId) ?? null;

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 shrink-0 border-b border-white/5" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
            <p className="text-sm text-zinc-500">Carregando pipeline...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <BoardTopbar
        jobCount={jobs.length}
        onNewVideo={() => setNewVideoOpen(true)}
        autoVideo={autoVideo}
        onToggleAutoVideo={(val) => {
          setAutoVideo(val);
          localStorage.setItem("autoVideo", String(val));
          toast(val ? "Auto Vídeo ativado" : "Auto Vídeo desativado", {
            description: val
              ? "Novos vídeos serão executados automaticamente"
              : "Novos vídeos serão criados como rascunho",
          });
        }}
      />

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActiveJobId(e.active.id as string)}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 min-w-max h-full">
            {COLUMNS.map((col) => (
              <BoardColumn
                key={col.id}
                column={col}
                jobs={getJobsForColumn(col).map((j) => ({
                  ...j,
                  isMoving: j.id === movingJobId,
                }))}
                onExecute={handleExecute}
                onSelect={handleSelectJob}
              />
            ))}
          </div>

          <DragOverlay>
            {activeJob ? <BoardCard job={activeJob} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* New Video Modal */}
      <NewVideoDialog
        open={newVideoOpen}
        onClose={() => setNewVideoOpen(false)}
        onCreated={handleNewVideo}
      />

      {/* Job Details Drawer */}
      <JobDetailsDrawer
        jobId={selectedJobId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
