"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import type { JobState } from "@/app/(platform)/board/types";

const STATE_LABEL: Record<JobState, string> = {
  DRAFT: "Rascunho",
  READY: "Pronto",
  SCRIPTING: "Gerando roteiro",
  SCRIPT_DONE: "Roteiro OK",
  TTS_RUNNING: "Narrando",
  TTS_DONE: "Narração OK",
  RENDER_READY: "Render Pronto",
  RENDER_RUNNING: "Renderizando",
  DONE: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (BR)" },
  { value: "es-ES", label: "Español (ES)" },
  { value: "en-US", label: "English (US)" },
];

const DURATION_OPTIONS = [
  { value: "short", label: "Curto (~12 min)" },
  { value: "medium", label: "Médio (~25 min)" },
  { value: "long", label: "Longo (~45 min)" },
];

const STORY_TYPE_OPTIONS = [
  { value: "historia_geral", label: "História Geral" },
  { value: "drama", label: "Drama" },
  { value: "misterio", label: "Mistério" },
];

const VISUAL_MODE_OPTIONS = [
  { value: "automatic", label: "Automático" },
  { value: "manual_upload", label: "Upload Manual" },
  { value: "manual_ai_single", label: "IA Manual" },
  { value: "manual_ai_batch", label: "IA Batch" },
];

type FullJob = {
  id: string;
  title: string;
  state: JobState;
  progress: number;
  recipe_key: string;
  language: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  input?: Record<string, unknown> | null;
  manifest?: Record<string, unknown> | null;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className={`text-xs text-zinc-300 text-right break-all max-w-[60%] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-zinc-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface Props {
  job: FullJob;
  onUpdate?: (config: Record<string, unknown>) => Promise<void> | void;
}

export function TabInformacoes({ job, onUpdate }: Props) {
  const input = job.input ?? {};
  const isEditable = ["DRAFT", "READY"].includes(job.state) && !!onUpdate;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    language: (input.language as string) || job.language || "pt-BR",
    durationPreset: (input.durationPreset as string) || "medium",
    storyType: (input.storyType as string) || "historia_geral",
    visualMode: (input.visualMode as string) || "automatic",
    imagesCount: (input.imagesCount as number) || 6,
    captionsEnabled: (input.captionsEnabled as boolean) ?? true,
    zoomEnabled: (input.zoomEnabled as boolean) ?? true,
  });

  async function handleSave() {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-4 space-y-0">
      {/* Core job info */}
      <InfoRow label="ID" value={job.id} mono />
      <Separator className="bg-white/5 my-1" />
      <InfoRow label="Receita" value={job.recipe_key} />
      <InfoRow label="Estado" value={STATE_LABEL[job.state] ?? job.state} />
      <InfoRow label="Progresso" value={`${job.progress}%`} />
      <Separator className="bg-white/5 my-1" />
      <InfoRow label="Criado em" value={formatDate(job.created_at)} />
      <InfoRow label="Iniciado em" value={formatDate(job.started_at)} />
      <InfoRow label="Concluído em" value={formatDate(job.completed_at)} />

      {/* Error */}
      {job.error_message && (
        <>
          <Separator className="bg-white/5 my-1" />
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 mt-2">
            <p className="text-[11px] text-red-400 font-semibold mb-1">Erro</p>
            <p className="text-xs text-red-300 whitespace-pre-wrap font-mono leading-relaxed">
              {job.error_message}
            </p>
          </div>
        </>
      )}

      {/* Editable config section */}
      {!editing && (
        <>
          <Separator className="bg-white/5 my-2" />
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest pb-2">
            Configuração
          </p>
          <InfoRow
            label="Idioma"
            value={LANGUAGE_OPTIONS.find((l) => l.value === form.language)?.label ?? form.language}
          />
          <InfoRow
            label="Duração"
            value={DURATION_OPTIONS.find((d) => d.value === form.durationPreset)?.label ?? form.durationPreset}
          />
          <InfoRow
            label="Tipo de História"
            value={STORY_TYPE_OPTIONS.find((s) => s.value === form.storyType)?.label ?? form.storyType}
          />
          <InfoRow
            label="Modo Visual"
            value={VISUAL_MODE_OPTIONS.find((v) => v.value === form.visualMode)?.label ?? form.visualMode}
          />
          <InfoRow label="Imagens" value={`${form.imagesCount}`} />
          <InfoRow label="Legendas" value={form.captionsEnabled ? "Sim" : "Não"} />
          <InfoRow label="Zoom" value={form.zoomEnabled ? "Sim" : "Não"} />

          {isEditable && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-3 w-full rounded-md border border-white/10 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              Editar Configurações
            </button>
          )}
        </>
      )}

      {editing && (
        <>
          <Separator className="bg-white/5 my-2" />
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest pb-2">
            Editar Configuração
          </p>
          <div className="space-y-3">
            <SelectField
              label="Idioma"
              value={form.language}
              options={LANGUAGE_OPTIONS}
              onChange={(v) => setForm({ ...form, language: v })}
            />
            <SelectField
              label="Duração"
              value={form.durationPreset}
              options={DURATION_OPTIONS}
              onChange={(v) => setForm({ ...form, durationPreset: v })}
            />
            <SelectField
              label="Tipo de História"
              value={form.storyType}
              options={STORY_TYPE_OPTIONS}
              onChange={(v) => setForm({ ...form, storyType: v })}
            />
            <SelectField
              label="Modo Visual"
              value={form.visualMode}
              options={VISUAL_MODE_OPTIONS}
              onChange={(v) => setForm({ ...form, visualMode: v })}
            />

            {form.visualMode === "automatic" && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[11px] text-zinc-500">Imagens: {form.imagesCount}</label>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={form.imagesCount}
                  onChange={(e) => setForm({ ...form, imagesCount: parseInt(e.target.value) })}
                  className="w-full h-1.5 appearance-none rounded-full bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D4AF37] cursor-pointer"
                />
              </div>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.captionsEnabled}
                  onChange={(e) => setForm({ ...form, captionsEnabled: e.target.checked })}
                  className="rounded"
                />
                Legendas
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.zoomEnabled}
                  onChange={(e) => setForm({ ...form, zoomEnabled: e.target.checked })}
                  className="rounded"
                />
                Efeito Zoom
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-md border border-white/10 py-1.5 text-xs text-zinc-400 hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-md bg-[#D4AF37]/10 py-1.5 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/20 disabled:opacity-50 transition-colors"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Raw input */}
      {job.input && Object.keys(job.input).length > 0 && !editing && (
        <>
          <Separator className="bg-white/5 my-1 mt-3" />
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest pt-2 pb-1">
            Entrada
          </p>
          <pre className="text-xs text-zinc-400 bg-white/[0.03] rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">
            {JSON.stringify(job.input, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
