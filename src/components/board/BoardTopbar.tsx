"use client";

import { useState } from "react";
import { PlusIcon, VideoIcon, ZapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardTopbarProps {
  jobCount: number;
  onNewVideo: () => void;
  autoVideo: boolean;
  onToggleAutoVideo: (val: boolean) => void;
}

const NAV_TABS = [
  { id: "board", label: "Board de Produção" },
] as const;

export function BoardTopbar({ jobCount, onNewVideo, autoVideo, onToggleAutoVideo }: BoardTopbarProps) {
  const [activeTab] = useState<string>("board");

  return (
    <header className="shrink-0 flex items-center justify-between gap-4 px-6 h-14 border-b border-white/5 bg-[#0A0A0A]">
      {/* Left: nav tabs */}
      <div className="flex items-center gap-1">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white/5 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <KanbanIcon />
            {tab.label}
          </button>
        ))}

        <div className="ml-3 flex items-center gap-1.5 text-xs text-zinc-600">
          <span className="font-mono tabular-nums">{jobCount}</span>
          <span>{jobCount === 1 ? "vídeo" : "vídeos"}</span>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-3">
        {/* Auto Vídeo toggle */}
        <div className="flex items-center gap-2">
          <ZapIcon className={cn("size-3.5 transition-colors", autoVideo ? "text-[#D4AF37]" : "text-zinc-600")} />
          <span className="text-xs text-zinc-500">Auto Vídeo</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoVideo}
            onClick={() => onToggleAutoVideo(!autoVideo)}
            className={cn(
              "relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus-visible:outline-none",
              autoVideo ? "bg-[#D4AF37]" : "bg-zinc-700",
            )}
          >
            <span
              className={cn(
                "inline-block size-3 rounded-full bg-white shadow-sm transition-transform",
                autoVideo ? "translate-x-3.5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* New video button */}
        <button
          type="button"
          onClick={onNewVideo}
          className="flex items-center gap-1.5 rounded-md bg-[#D4AF37] px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-[#C4A030]"
        >
          <PlusIcon className="size-3.5" />
          Novo Vídeo
        </button>
      </div>
    </header>
  );
}

function KanbanIcon() {
  return (
    <VideoIcon className="size-3.5 text-[#D4AF37]" />
  );
}
