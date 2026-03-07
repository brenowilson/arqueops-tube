import { MicIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type JobStep = {
  step_key: string;
  status: string;
  output: { text?: string; usage?: Record<string, unknown> } | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type Artifact = {
  step_key: string;
  path: string;
  mime_type: string;
  file_size: number | null;
};

interface Props {
  steps: JobStep[];
  artifacts: Artifact[];
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function TabAudios({ steps, artifacts }: Props) {
  const ttsSteps = steps.filter(
    (s) => s.step_key === "tts" || s.step_key.includes("narr") || s.step_key.includes("audio")
  );
  const audioArtifacts = artifacts.filter((a) => a.mime_type?.startsWith("audio/"));

  if (ttsSteps.length === 0 && audioArtifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/5">
          <MicIcon className="size-6 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-600">Nenhum áudio gerado ainda</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-3">
      {/* TTS steps */}
      {ttsSteps.map((step) => {
        const isDone = step.status === "done" || step.status === "completed";
        const isFailed = step.status === "failed" || step.status === "error";
        const isRunning = step.status === "running";

        return (
          <div key={step.step_key} className="rounded-lg border border-white/5 bg-[#1A1A1A] p-3 space-y-2">
            <div className="flex items-center gap-2">
              {isDone && <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />}
              {isFailed && <XCircle className="size-3.5 text-red-400 shrink-0" />}
              {isRunning && <Loader2 className="size-3.5 text-[#D4AF37] animate-spin shrink-0" />}
              {!isDone && !isFailed && !isRunning && <MicIcon className="size-3.5 text-zinc-600 shrink-0" />}
              <span className="text-sm font-medium text-white font-mono">{step.step_key}</span>
              {formatDuration(step.started_at, step.completed_at) && (
                <span className="ml-auto text-[10px] text-zinc-600">
                  {formatDuration(step.started_at, step.completed_at)}
                </span>
              )}
            </div>
            {step.error && (
              <p className="text-xs text-red-400 font-mono bg-red-500/5 rounded p-2">{step.error}</p>
            )}
          </div>
        );
      })}

      {/* Audio artifacts */}
      {audioArtifacts.map((artifact, idx) => (
        <div key={idx} className="rounded-lg border border-white/5 bg-[#1A1A1A] p-3">
          <div className="flex items-center gap-2 mb-2">
            <MicIcon className="size-3.5 text-[#D4AF37]/60 shrink-0" />
            <span className="text-xs font-mono text-zinc-400 truncate flex-1">{artifact.step_key}</span>
            {artifact.file_size && (
              <span className="text-[10px] text-zinc-600 shrink-0">{formatSize(artifact.file_size)}</span>
            )}
          </div>
          <audio controls className="w-full h-8" style={{ filter: "invert(1) hue-rotate(180deg)" }}>
            <source src={artifact.path} type={artifact.mime_type} />
          </audio>
        </div>
      ))}
    </div>
  );
}
