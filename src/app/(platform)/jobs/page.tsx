import { createServiceClient } from "@/lib/supabase/server";
import { Progress } from "@/components/ui/progress";
import type { JobState } from "@/app/(platform)/board/types";

const STATE_LABEL: Record<JobState, string> = {
  DRAFT: "Rascunho",
  READY: "Pronto",
  SCRIPTING: "Roteiro",
  SCRIPT_DONE: "Roteiro OK",
  TTS_RUNNING: "Narração",
  TTS_DONE: "Narração OK",
  RENDER_READY: "Render Pronto",
  RENDER_RUNNING: "Renderizando",
  DONE: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

const STATE_VARIANT: Record<JobState, string> = {
  DRAFT: "bg-zinc-700 text-zinc-300",
  READY: "bg-blue-900 text-blue-300",
  SCRIPTING: "bg-yellow-900 text-yellow-300",
  SCRIPT_DONE: "bg-emerald-900 text-emerald-300",
  TTS_RUNNING: "bg-purple-900 text-purple-300",
  TTS_DONE: "bg-purple-800 text-purple-200",
  RENDER_READY: "bg-orange-900 text-orange-300",
  RENDER_RUNNING: "bg-orange-800 text-orange-200",
  DONE: "bg-[#D4AF37]/20 text-[#D4AF37]",
  FAILED: "bg-red-900 text-red-300",
  CANCELLED: "bg-zinc-800 text-zinc-400",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function JobsPage() {
  const supabase = createServiceClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Jobs</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {jobs?.length ?? 0} jobs no sistema
        </p>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-white/5 bg-[#111111]">
          <p className="text-zinc-500">Nenhum job criado ainda.</p>
          <p className="text-zinc-600 text-sm mt-1">Crie um vídeo no Board para começar.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-32">Progresso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Recipe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium max-w-xs">
                    <span className="line-clamp-1">{job.title}</span>
                    <span className="block text-[11px] text-zinc-600 mt-0.5">{job.language}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATE_VARIANT[job.state as JobState] ?? "bg-zinc-700"}`}>
                      {STATE_LABEL[job.state as JobState] ?? job.state}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={job.progress} className="h-1.5 w-20" />
                      <span className="text-xs text-zinc-500 w-8 text-right">{job.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{job.recipe_key}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{formatDate(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
