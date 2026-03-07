"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2Icon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, Loader2 } from "lucide-react";
import { createAndExecuteJob } from "@/app/(platform)/board/actions";

const STEPS = [
  { id: "topic", label: "Tópico" },
  { id: "config", label: "Configuração" },
  { id: "review", label: "Revisão" },
];

const LANGUAGES = [
  { value: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { value: "es-ES", label: "Español", flag: "🇪🇸" },
  { value: "en-US", label: "English", flag: "🇺🇸" },
];

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    topic: "",
    language: "pt-BR",
    recipe_key: "video-completo",
  });

  async function handleCreate() {
    if (!form.title || !form.topic) return;
    setLoading(true);
    try {
      await createAndExecuteJob(form);
      router.push("/board");
    } catch (err) {
      console.error("Wizard error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
            <Wand2Icon className="size-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Wizard de Criação</h1>
            <p className="text-sm text-zinc-500">Crie um novo vídeo passo a passo</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
                  i <= step
                    ? "bg-[#D4AF37] text-black"
                    : "bg-white/5 text-zinc-500"
                }`}
              >
                {i < step ? <CheckIcon className="size-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i <= step ? "text-white" : "text-zinc-600"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-px ${i < step ? "bg-[#D4AF37]" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Título do Vídeo</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Os Mistérios Não Resolvidos do Triângulo das Bermudas"
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Tópico / Briefing</label>
                <textarea
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  rows={4}
                  placeholder="Descreva o tema do vídeo em detalhes..."
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Idioma</label>
                <div className="grid grid-cols-3 gap-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setForm({ ...form, language: lang.value })}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                        form.language === lang.value
                          ? "border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]"
                          : "border-white/10 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Recipe</label>
                <select
                  value={form.recipe_key}
                  onChange={(e) => setForm({ ...form, recipe_key: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none"
                >
                  <option value="video-completo">Vídeo Completo (12 etapas)</option>
                  <option value="video-curto">Vídeo Curto (8 etapas)</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Confirme os dados</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <span className="text-sm text-zinc-400">Título</span>
                  <span className="text-sm text-white">{form.title || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <span className="text-sm text-zinc-400">Idioma</span>
                  <span className="text-sm text-white">
                    {LANGUAGES.find((l) => l.value === form.language)?.flag}{" "}
                    {LANGUAGES.find((l) => l.value === form.language)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <span className="text-sm text-zinc-400">Recipe</span>
                  <span className="text-sm text-white">{form.recipe_key}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => step > 0 ? setStep(step - 1) : router.push("/board")}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="size-4" />
            {step > 0 ? "Voltar" : "Cancelar"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && (!form.title || !form.topic)}
              className="flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-medium text-black hover:bg-[#C4A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
              <ArrowRightIcon className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-medium text-black hover:bg-[#C4A030] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2Icon className="size-4" />}
              Criar e Executar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
