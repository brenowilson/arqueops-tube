"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, XIcon, DownloadIcon, StopCircleIcon, RefreshCwIcon, PlayIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  fetchJobDetails,
  fetchJobSteps,
  fetchJobEvents,
  executeJob,
  cancelJob,
} from "@/app/(platform)/board/actions";
import type { JobState } from "@/app/(platform)/board/types";
import { TabInformacoes } from "./drawer/TabInformacoes";
import { TabOutline } from "./drawer/TabOutline";
import { TabImagens } from "./drawer/TabImagens";
import { TabRoteiro } from "./drawer/TabRoteiro";
import { TabAudios } from "./drawer/TabAudios";
import { TabLogs } from "./drawer/TabLogs";

type JobStep = {
  job_id: string;
  step_key: string;
  status: string;
  output: { text?: string; usage?: Record<string, unknown> } | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type JobEvent = {
  job_id: string;
  type: string;
  data: Record<string, unknown> | null;
  created_at: string;
};

type Artifact = {
  step_key: string;
  path: string;
  mime_type: string;
  file_size: number | null;
};

type FullJob = {
  id: string;
  title: string;
  state: JobState;
  progress: number;
  recipe_key: string;
  language: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  input?: Record<string, unknown> | null;
  manifest?: Record<string, unknown> | null;
};

const STATE_BADGE: Record<JobState, { label: string; className: string }> = {
  DRAFT:          { label: "Rascunho",        className: "bg-zinc-800 text-zinc-400" },
  READY:          { label: "Pronto",          className: "bg-blue-950 text-blue-400 border border-blue-500/20" },
  SCRIPTING:      { label: "Gerando roteiro", className: "bg-yellow-950 text-yellow-400 border border-yellow-500/20" },
  SCRIPT_DONE:    { label: "Roteiro OK",      className: "bg-emerald-950 text-emerald-400 border border-emerald-500/20" },
  TTS_RUNNING:    { label: "Narrando",        className: "bg-orange-950 text-orange-400 border border-orange-500/20" },
  TTS_DONE:       { label: "Narração OK",     className: "bg-orange-950 text-orange-300 border border-orange-500/20" },
  RENDER_READY:   { label: "Render Pronto",   className: "bg-purple-950 text-purple-400 border border-purple-500/20" },
  RENDER_RUNNING: { label: "Renderizando",    className: "bg-purple-950 text-purple-300 border border-purple-500/20" },
  DONE:           { label: "Concluído",       className: "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" },
  FAILED:         { label: "Falhou",          className: "bg-red-950 text-red-400 border border-red-500/20" },
  CANCELLED:      { label: "Cancelado",       className: "bg-zinc-900 text-zinc-500" },
};

const RUNNING_STATES: JobState[] = ["SCRIPTING", "TTS_RUNNING", "RENDER_RUNNING"];

type TabId = "info" | "outline" | "imagens" | "roteiro" | "audios" | "logs";

const TABS: { id: TabId; label: string }[] = [
  { id: "info",    label: "Informações" },
  { id: "outline", label: "Outline" },
  { id: "imagens", label: "Imagens" },
  { id: "roteiro", label: "Roteiro" },
  { id: "audios",  label: "Áudios" },
  { id: "logs",    label: "Logs" },
];

interface Props {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobDetailsDrawer({ jobId, open, onOpenChange }: Props) {
  const [job, setJob] = useState<FullJob | null>(null);
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [artifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("info");

  const loadData = useCallback(async () => {
    if (!jobId) return;
    try {
      const [jobData, stepsData, eventsData] = await Promise.all([
        fetchJobDetails(jobId),
        fetchJobSteps(jobId),
        fetchJobEvents(jobId),
      ]);
      setJob(jobData as FullJob);
      setSteps((stepsData ?? []) as JobStep[]);
      setEvents((eventsData ?? []) as JobEvent[]);
    } catch (err) {
      console.error("Failed to load job details:", err);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !open) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setJob(null);
      setSteps([]);
      setEvents([]);
      setActiveTab("info");
      try {
        await loadData();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, open]);

  // Poll while running
  useEffect(() => {
    if (!open || !job) return;
    if (!RUNNING_STATES.includes(job.state)) return;

    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [open, job, loadData]);

  const [actionLoading, setActionLoading] = useState(false);

  const badge = job ? (STATE_BADGE[job.state] ?? STATE_BADGE.DRAFT) : null;
  const isRunning = job ? RUNNING_STATES.includes(job.state) : false;
  const canRetry = job?.state === "FAILED";
  const canCancel = job ? RUNNING_STATES.includes(job.state) || job.state === "READY" : false;
  const canExecute = job?.state === "DRAFT" || job?.state === "READY";
  const isDone = job?.state === "DONE";

  async function handleExecute() {
    if (!job || actionLoading) return;
    setActionLoading(true);
    try {
      await executeJob(job.id);
      toast.success("Execução iniciada");
      await loadData();
    } catch (err) {
      console.error("Execute failed:", err);
      toast.error("Erro ao executar", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!job || actionLoading) return;
    setActionLoading(true);
    try {
      await cancelJob(job.id);
      toast.success("Job cancelado");
      await loadData();
    } catch (err) {
      console.error("Cancel failed:", err);
      toast.error("Erro ao cancelar", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRetry() {
    if (!job || actionLoading) return;
    setActionLoading(true);
    try {
      await executeJob(job.id);
      toast.success("Tentando novamente...");
      await loadData();
    } catch (err) {
      console.error("Retry failed:", err);
      toast.error("Erro ao tentar novamente", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    } finally {
      setActionLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col",
          "bg-[#111111] border-l border-white/5 shadow-2xl shadow-black/50",
          "animate-in slide-in-from-right duration-300",
        )}
      >
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-6 animate-spin text-[#D4AF37]" />
              <p className="text-xs text-zinc-500">Carregando detalhes...</p>
            </div>
          </div>
        )}

        {!loading && !job && open && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-zinc-500">Job não encontrado.</p>
          </div>
        )}

        {!loading && job && (
          <>
            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-zinc-600 mb-1">#{job.id.slice(0, 8)}</p>
                  <h2 className="text-base font-semibold text-white leading-snug line-clamp-2">
                    {job.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {badge && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        badge.className,
                      )}
                    >
                      {isRunning && <Loader2 className="size-2.5 animate-spin" />}
                      {badge.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              {(job.progress > 0 || isRunning) && (
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">{job.recipe_key} · {job.language}</span>
                    <span className="text-zinc-400 tabular-nums font-mono">{job.progress}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-[#D4AF37] transition-all duration-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {canCancel && (
                  <ActionButton icon={<StopCircleIcon className="size-3.5" />} label="Cancelar" variant="danger" onClick={handleCancel} disabled={actionLoading} />
                )}
                {canRetry && (
                  <ActionButton icon={<RefreshCwIcon className="size-3.5" />} label="Tentar Novamente" onClick={handleRetry} disabled={actionLoading} />
                )}
                {canExecute && (
                  <ActionButton icon={<PlayIcon className="size-3.5" />} label="Executar" variant="gold" onClick={handleExecute} disabled={actionLoading} />
                )}
                {isDone && (
                  <ActionButton icon={<DownloadIcon className="size-3.5" />} label="Baixar Vídeo" variant="gold" />
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex gap-0.5 px-3 py-2 border-b border-white/5 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all",
                    activeTab === tab.id
                      ? "bg-white/5 text-white"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <ScrollArea className="flex-1 min-h-0">
              {activeTab === "info" && <TabInformacoes job={job} />}
              {activeTab === "outline" && <TabOutline steps={steps} />}
              {activeTab === "imagens" && <TabImagens artifacts={artifacts} />}
              {activeTab === "roteiro" && <TabRoteiro steps={steps} />}
              {activeTab === "audios" && <TabAudios steps={steps} artifacts={artifacts} />}
              {activeTab === "logs" && <TabLogs events={events} />}
            </ScrollArea>
          </>
        )}
      </div>
    </>
  );
}

function ActionButton({
  icon,
  label,
  variant = "default",
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "danger" | "gold";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
        variant === "gold" && "bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20",
        variant === "danger" && "bg-red-500/10 text-red-400 hover:bg-red-500/20",
        variant === "default" && "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {disabled ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}
