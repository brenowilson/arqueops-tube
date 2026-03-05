"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Job, JobState } from "@/app/(platform)/board/types";

const STATE_BADGE: Record<JobState, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-zinc-700 text-zinc-300" },
  READY: { label: "Pronto", className: "bg-blue-900 text-blue-300" },
  SCRIPTING: { label: "Roteiro", className: "bg-yellow-900 text-yellow-300" },
  SCRIPT_DONE: { label: "Roteiro OK", className: "bg-emerald-900 text-emerald-300" },
  TTS_RUNNING: { label: "Narração", className: "bg-purple-900 text-purple-300" },
  TTS_DONE: { label: "Narração OK", className: "bg-purple-800 text-purple-200" },
  RENDER_READY: { label: "Render Pronto", className: "bg-orange-900 text-orange-300" },
  RENDER_RUNNING: { label: "Renderizando", className: "bg-orange-800 text-orange-200" },
  DONE: { label: "Concluído", className: "bg-[#D4AF37]/20 text-[#D4AF37]" },
  FAILED: { label: "Falhou", className: "bg-red-900 text-red-300" },
  CANCELLED: { label: "Cancelado", className: "bg-zinc-800 text-zinc-400" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

interface BoardCardProps {
  job: Job;
}

export function BoardCard({ job }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const badge = STATE_BADGE[job.state];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => console.log("Job:", job.id)}
      className={cn(
        "rounded-lg border border-white/5 bg-[#1A1A1A] p-3 cursor-grab active:cursor-grabbing",
        "hover:border-[#D4AF37]/20 hover:bg-[#1E1E1E] transition-colors",
        isDragging && "opacity-50 shadow-lg shadow-black/50"
      )}
    >
      <p className="text-sm font-medium text-white leading-snug mb-2 line-clamp-2">
        {job.title}
      </p>

      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
            badge.className
          )}
        >
          {badge.label}
        </span>
        <span className="text-[10px] text-zinc-500">{formatDate(job.created_at)}</span>
      </div>

      {job.progress > 0 && (
        <div className="space-y-1">
          <Progress value={job.progress} className="h-1" />
          <p className="text-[10px] text-zinc-500 text-right">{job.progress}%</p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-600">{job.recipe_key}</span>
        <span className="text-[10px] text-zinc-700">·</span>
        <span className="text-[10px] text-zinc-600">{job.language}</span>
      </div>
    </div>
  );
}
