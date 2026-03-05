import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Job, JobState } from "@/app/(platform)/board/types";

const STATE_LABEL: Record<JobState, string> = {
  DRAFT: "Rascunho",
  READY: "Pronto",
  SCRIPTING: "Roteiro",
  SCRIPT_DONE: "Roteiro OK",
  TTS_RUNNING: "Narracao",
  TTS_DONE: "Narracao OK",
  RENDER_READY: "Render Pronto",
  RENDER_RUNNING: "Renderizando",
  DONE: "Concluido",
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

const MOCK_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Como criar um site do zero com Next.js 14",
    state: "DRAFT",
    progress: 0,
    recipe_key: "video-completo",
    language: "pt-BR",
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "job-2",
    title: "Guia completo de Tailwind CSS para iniciantes",
    state: "SCRIPTING",
    progress: 35,
    recipe_key: "video-completo",
    language: "pt-BR",
    created_at: "2026-03-02T14:30:00Z",
    started_at: "2026-03-02T15:00:00Z",
  },
  {
    id: "job-3",
    title: "Top 10 ferramentas de IA para desenvolvedores em 2026",
    state: "TTS_RUNNING",
    progress: 72,
    recipe_key: "video-curto",
    language: "es-ES",
    created_at: "2026-03-03T09:00:00Z",
    started_at: "2026-03-03T09:30:00Z",
  },
  {
    id: "job-4",
    title: "React vs Vue em 2026: qual escolher?",
    state: "DONE",
    progress: 100,
    recipe_key: "video-completo",
    language: "en-US",
    created_at: "2026-03-04T08:00:00Z",
    started_at: "2026-03-04T08:15:00Z",
    completed_at: "2026-03-04T11:45:00Z",
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function JobsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Jobs</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {MOCK_JOBS.length} jobs no sistema
        </p>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Titulo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-32">
                Progresso
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Recipe
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Criado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MOCK_JOBS.map((job) => (
              <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-white font-medium max-w-xs">
                  <span className="line-clamp-1">{job.title}</span>
                  <span className="block text-[11px] text-zinc-600 mt-0.5">{job.language}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATE_VARIANT[job.state]}`}
                  >
                    {STATE_LABEL[job.state]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Progress value={job.progress} className="h-1.5 w-20" />
                    <span className="text-xs text-zinc-500 w-8 text-right">
                      {job.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">{job.recipe_key}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                  {formatDate(job.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
