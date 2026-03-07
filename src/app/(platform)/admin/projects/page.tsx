"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  YoutubeIcon,
  PlusIcon,
  Loader2,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchChannels, createChannel, deleteChannel } from "./actions";

interface Channel {
  id: string;
  name: string;
  handle: string | null;
  url: string | null;
  description: string | null;
  language: string;
  niche: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ProjectsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadChannels() {
    try {
      const data = await fetchChannels();
      setChannels(data as Channel[]);
    } catch (err) {
      console.error("Failed to load channels:", err);
      toast.error("Erro ao carregar canais");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChannels();
  }, []);

  async function handleCreate(data: {
    name: string;
    handle: string;
    url: string;
    niche: string;
    language: string;
  }) {
    try {
      await createChannel(data);
      toast.success("Canal adicionado!", { description: data.name });
      setShowForm(false);
      loadChannels();
    } catch (err) {
      toast.error("Erro ao criar canal", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o canal "${name}"?`)) return;
    try {
      await deleteChannel(id);
      toast.success("Canal removido");
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error("Erro ao remover canal", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Canais YouTube</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gerencie os canais de produção de vídeo
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-medium text-black hover:bg-[#C4A030] transition-colors"
        >
          <PlusIcon className="size-4" />
          Novo Canal
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-[#D4AF37]" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-white/5 bg-[#111111]">
          <div className="flex size-14 items-center justify-center rounded-xl bg-[#D4AF37]/10 mb-4">
            <YoutubeIcon className="size-7 text-[#D4AF37]" />
          </div>
          <p className="text-sm font-medium text-white mb-1">
            Nenhum canal cadastrado
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Adicione seu primeiro canal YouTube para começar
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[#D4AF37]/10 px-4 py-2 text-sm font-medium text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
          >
            <PlusIcon className="size-4" />
            Adicionar Canal
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="rounded-xl border border-white/5 bg-[#111111] p-5 hover:border-[#D4AF37]/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                  <YoutubeIcon className="size-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {channel.name}
                  </h3>
                  {channel.handle && (
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {channel.handle}
                    </p>
                  )}
                  {channel.niche && (
                    <p className="text-xs text-zinc-400 mt-1.5">
                      {channel.niche}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
                    <span>{channel.language}</span>
                    <span>
                      {new Date(channel.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      channel.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {channel.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <button
                    onClick={() => handleDelete(channel.id, channel.name)}
                    className="flex size-7 items-center justify-center rounded-md text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Channel Form Modal */}
      {showForm && (
        <NewChannelForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function NewChannelForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: {
    name: string;
    handle: string;
    url: string;
    niche: string;
    language: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome do canal é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name, handle, url, niche, language });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#111111] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <h2 className="text-base font-semibold text-white">Novo Canal YouTube</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Nome do Canal *
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Ex: Tech Insights Brasil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Handle (@)
            </label>
            <input
              type="text"
              placeholder="Ex: @techinsightsbr"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={saving}
              className="w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              URL do Canal
            </label>
            <input
              type="text"
              placeholder="https://youtube.com/@techinsightsbr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={saving}
              className="w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Nicho
              </label>
              <input
                type="text"
                placeholder="Ex: tecnologia"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Idioma
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50 disabled:opacity-50"
              >
                <option value="pt-BR">Português (BR)</option>
                <option value="es-ES">Español (ES)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className={cn(
              "w-full rounded-lg py-2.5 text-sm font-semibold transition-all mt-2",
              saving || !name.trim()
                ? "bg-[#D4AF37]/30 text-black/40 cursor-not-allowed"
                : "bg-[#D4AF37] text-black hover:bg-[#C4A030]",
            )}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              "Adicionar Canal"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
