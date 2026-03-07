import { Clock, ActivityIcon } from "lucide-react";

type JobEvent = {
  job_id: string;
  type: string;
  data: Record<string, unknown> | null;
  created_at: string;
};

interface Props {
  events: JobEvent[];
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  state_changed: "text-[#D4AF37]",
  step_started: "text-blue-400",
  step_completed: "text-emerald-400",
  step_failed: "text-red-400",
  job_started: "text-[#D4AF37]",
  job_completed: "text-emerald-400",
  job_failed: "text-red-400",
  job_cancelled: "text-zinc-500",
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TabLogs({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/5">
          <ActivityIcon className="size-6 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-600">Nenhum evento registrado</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-0">
      {events.map((event, idx) => {
        const typeColor = EVENT_TYPE_COLORS[event.type] ?? "text-zinc-400";
        const hasData = event.data && Object.keys(event.data).length > 0;

        return (
          <div key={idx} className="flex gap-3 py-2.5 border-b border-white/5 last:border-0">
            {/* Timeline */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <Clock className="size-3 text-[#D4AF37]/40" />
              {idx < events.length - 1 && (
                <div className="w-px flex-1 bg-white/5 mt-1 min-h-[1rem]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className={`text-xs font-medium font-mono ${typeColor}`}>
                  {event.type}
                </span>
                <span className="text-[10px] text-zinc-700 shrink-0 tabular-nums">
                  {formatDateTime(event.created_at)}
                </span>
              </div>

              {hasData && (
                <details className="mt-1 group">
                  <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 select-none list-none flex items-center gap-1">
                    <span className="group-open:hidden">+ ver dados</span>
                    <span className="hidden group-open:inline">- ocultar</span>
                  </summary>
                  <pre className="text-[10px] text-zinc-500 mt-1 whitespace-pre-wrap font-mono bg-white/[0.03] rounded p-2 overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
