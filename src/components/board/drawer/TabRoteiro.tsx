"use client";

import { useState } from "react";
import { FileTextIcon, CopyIcon, DownloadIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type JobStep = {
  step_key: string;
  status: string;
  output: { text?: string; usage?: Record<string, unknown> } | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

interface Props {
  steps: JobStep[];
}

export function TabRoteiro({ steps }: Props) {
  const [copied, setCopied] = useState(false);

  const scriptStep = steps.find(
    (s) => s.step_key === "roteiro" || s.step_key === "script" || s.step_key === "scripting"
  );

  if (!scriptStep) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/5">
          <FileTextIcon className="size-6 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-600">Roteiro ainda não gerado</p>
      </div>
    );
  }

  if (scriptStep.error) {
    return (
      <div className="px-5 py-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[11px] text-red-400 font-semibold mb-1">Erro na etapa de roteiro</p>
          <p className="text-xs text-red-300 font-mono whitespace-pre-wrap">{scriptStep.error}</p>
        </div>
      </div>
    );
  }

  const text = scriptStep?.output?.text;

  if (!text) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-zinc-600">Conteúdo do roteiro vazio.</p>
      </div>
    );
  }

  const usage = scriptStep?.output?.usage;
  const stepKey = scriptStep?.step_key ?? "roteiro";

  function handleCopy() {
    navigator.clipboard.writeText(text!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([text!], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roteiro-${stepKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs transition-colors",
            copied
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          )}
        >
          {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
        >
          <DownloadIcon className="size-3" />
          Download
        </button>
      </div>

      {/* Token usage */}
      {usage && (
        <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-[#1A1A1A] border border-white/5">
          {Object.entries(usage).map(([key, val]) => (
            <div key={key} className="text-[11px]">
              <span className="text-zinc-600">{key}: </span>
              <span className="text-zinc-400 font-mono">{String(val)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Script content */}
      <div className="rounded-lg bg-[#1A1A1A] border border-white/5 p-4">
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      </div>
    </div>
  );
}
