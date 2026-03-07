import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Zap, Clock, CheckCircle, XCircle, Plus, ArrowRight } from "lucide-react";

async function getDashboardData() {
  const supabase = createServiceClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, state, recipe_key, language, progress, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const allJobs = jobs || [];

  const today = new Date().toISOString().split("T")[0];

  const running = allJobs.filter((j) =>
    ["SCRIPTING", "TTS_RUNNING", "RENDER_RUNNING"].includes(j.state),
  ).length;

  const completedToday = allJobs.filter(
    (j) => j.state === "DONE" && j.completed_at?.startsWith(today),
  ).length;

  const totalFinished = allJobs.filter((j) =>
    ["DONE", "FAILED"].includes(j.state),
  ).length;
  const completed = allJobs.filter((j) => j.state === "DONE").length;
  const failed = allJobs.filter((j) => j.state === "FAILED").length;
  const successRate = totalFinished > 0 ? Math.round((completed / totalFinished) * 100) : 100;

  return { allJobs, running, completedToday, successRate, failed };
}

const STATE_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-zinc-800 text-zinc-400" },
  READY: { label: "Pronto", className: "bg-blue-950 text-blue-400" },
  SCRIPTING: { label: "Roteiro...", className: "bg-yellow-950 text-yellow-400" },
  SCRIPT_DONE: { label: "Roteiro OK", className: "bg-emerald-950 text-emerald-400" },
  TTS_RUNNING: { label: "Narrando...", className: "bg-orange-950 text-orange-400" },
  TTS_DONE: { label: "Narração OK", className: "bg-orange-950 text-orange-300" },
  RENDER_RUNNING: { label: "Renderizando...", className: "bg-purple-950 text-purple-400" },
  DONE: { label: "Concluído", className: "bg-[#D4AF37]/10 text-[#D4AF37]" },
  FAILED: { label: "Falhou", className: "bg-red-950 text-red-400" },
  CANCELLED: { label: "Cancelado", className: "bg-zinc-900 text-zinc-500" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const { allJobs, running, completedToday, successRate, failed } = await getDashboardData();
  const recentJobs = allJobs.slice(0, 6);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">DarkFlow OS</h1>
          <p className="text-sm text-zinc-500 mt-1">Control Room — Visão geral da produção</p>
        </div>
        <Link
          href="/board"
          className="flex items-center gap-2 rounded-lg bg-[#D4AF37]/10 px-4 py-2 text-sm font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
        >
          <Plus className="size-4" />
          Ir para Produção
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Em Produção"
          value={running}
          icon={<Zap className="size-4 text-yellow-400" />}
          color="yellow"
        />
        <MetricCard
          label="Concluídos Hoje"
          value={completedToday}
          icon={<Clock className="size-4 text-blue-400" />}
          color="blue"
        />
        <MetricCard
          label="Taxa Sucesso"
          value={`${successRate}%`}
          icon={<CheckCircle className="size-4 text-emerald-400" />}
          color="emerald"
        />
        <MetricCard
          label="Falhados"
          value={failed}
          icon={<XCircle className="size-4 text-red-400" />}
          color="red"
        />
      </div>

      {/* Recent Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Jobs Recentes</h2>
          <Link
            href="/board"
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-[#D4AF37] transition-colors"
          >
            Ver todos ({allJobs.length})
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-16 rounded-lg border border-white/5 bg-[#111]">
            <p className="text-zinc-500">Nenhum job criado ainda.</p>
            <Link
              href="/board"
              className="inline-flex items-center gap-2 mt-4 rounded-md bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#D4AF37] hover:bg-[#D4AF37]/20"
            >
              Criar primeiro vídeo
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentJobs.map((job) => {
              const badge = STATE_BADGE[job.state] || STATE_BADGE.DRAFT;
              return (
                <div
                  key={job.id}
                  className="rounded-lg border border-white/5 bg-[#1A1A1A] p-4 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-zinc-600">
                      #{job.id.slice(0, 8)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-white leading-snug mb-3 line-clamp-2">
                    {job.title || "Sem título"}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{job.recipe_key}</span>
                    <span>{formatDate(job.created_at)}</span>
                  </div>

                  {job.progress > 0 && (
                    <div className="mt-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            job.state === "DONE" ? "bg-emerald-500" : job.state === "FAILED" ? "bg-red-500" : "bg-[#D4AF37]"
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#1A1A1A] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
