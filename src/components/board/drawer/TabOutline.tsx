import { CheckCircle2, Circle } from "lucide-react";

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

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function TabOutline({ steps }: Props) {
  const outlineStep = steps.find((s) =>
    s.step_key === "outline" || s.step_key === "roteiro-estrutura"
  );

  if (!outlineStep) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-1">
          <Circle className="size-8 text-zinc-700 mx-auto" />
          <p className="text-sm text-zinc-600">Outline ainda não gerado</p>
        </div>
      </div>
    );
  }

  const duration = formatDuration(outlineStep.started_at, outlineStep.completed_at);

  if (outlineStep.error) {
    return (
      <div className="px-5 py-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400 font-mono whitespace-pre-wrap">{outlineStep.error}</p>
        </div>
      </div>
    );
  }

  const text = outlineStep.output?.text;

  if (!text) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-zinc-600">Nenhum conteúdo de outline.</p>
      </div>
    );
  }

  // Try to parse sections if JSON, otherwise render as plain text
  let sections: string[] = [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      sections = parsed.map((item) =>
        typeof item === "string" ? item : JSON.stringify(item)
      );
    }
  } catch {
    sections = text.split("\n").filter(Boolean);
  }

  return (
    <div className="px-5 py-4 space-y-3">
      {duration && (
        <p className="text-[10px] text-zinc-600 font-mono">Gerado em {duration}</p>
      )}
      <div className="space-y-2">
        {sections.map((section, idx) => (
          <div key={idx} className="flex items-start gap-3 rounded-lg bg-[#1A1A1A] border border-white/5 px-3 py-2.5">
            <CheckCircle2 className="size-3.5 text-[#D4AF37]/60 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300 leading-relaxed">{section}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
