import {
  FileTextIcon,
  ChefHatIcon,
  MicIcon,
  VideoIcon,
  ServerIcon,
  BookOpenIcon,
  ActivityIcon,
} from "lucide-react";

const ADMIN_CARDS = [
  {
    icon: FileTextIcon,
    title: "Prompts",
    description: "Gerencie os prompts de cada etapa do pipeline de producao.",
    count: 12,
    href: "/admin/prompts",
  },
  {
    icon: ChefHatIcon,
    title: "Recipes",
    description: "Configuracoes de fluxo para video-completo, video-curto e outros.",
    count: 4,
    href: "/admin/recipes",
  },
  {
    icon: MicIcon,
    title: "Presets de Voz",
    description: "Vozes TTS configuradas por idioma e estilo.",
    count: 8,
    href: "/admin/presets?type=voice",
  },
  {
    icon: VideoIcon,
    title: "Presets de Video",
    description: "Templates de edicao, resolucao e formatos de saida.",
    count: 5,
    href: "/admin/presets?type=video",
  },
  {
    icon: ServerIcon,
    title: "Provedores",
    description: "Integracao com APIs externas: TTS, render, storage.",
    count: 6,
    href: "/admin/providers",
  },
  {
    icon: BookOpenIcon,
    title: "Base de Conhecimento",
    description: "Documentos e contexto injetados nos agentes durante a producao.",
    count: 23,
    href: "/admin/knowledge-base",
  },
  {
    icon: ActivityIcon,
    title: "Mapa de Execucao",
    description: "Visualize o fluxo completo de execucao de um job em tempo real.",
    count: null,
    href: "/admin/execution-map",
  },
];

export default function AdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Admin</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Configure e monitore todos os componentes do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_CARDS.map(({ icon: Icon, title, description, count, href }) => (
          <a
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-white/5 bg-[#111111] p-5 transition-colors hover:border-[#D4AF37]/20 hover:bg-[#141414]"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                <Icon className="size-5 text-[#D4AF37]" />
              </div>
              {count !== null && (
                <span className="text-xs text-zinc-600 font-medium">{count} itens</span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">
                {title}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
