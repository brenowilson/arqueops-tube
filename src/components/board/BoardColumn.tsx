"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BoardCard } from "@/components/board/BoardCard";
import { cn } from "@/lib/utils";
import type { Job, Column } from "@/app/(platform)/board/types";

interface BoardColumnProps {
  column: Column;
  jobs: Job[];
}

export function BoardColumn({ column, jobs }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="border-t-2 border-t-[#D4AF37]/40 rounded-t-md px-3 pt-3 pb-2 bg-[#111111]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/80">{column.label}</h3>
          <span className="inline-flex items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 min-w-[1.25rem]">
            {jobs.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 min-h-[12rem] p-2 rounded-b-md bg-[#0D0D0D] border border-t-0 border-white/5 transition-colors",
          isOver && "bg-[#D4AF37]/5 border-[#D4AF37]/20"
        )}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <BoardCard key={job.id} job={job} />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-zinc-700">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
}
