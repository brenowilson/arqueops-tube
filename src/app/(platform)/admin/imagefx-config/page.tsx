"use client";

import { useState } from "react";
import { SettingsIcon, SaveIcon, Loader2 } from "lucide-react";

export default function ImageFXConfigPage() {
  const [cookies, setCookies] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    // TODO: Save to .env or DB
    setTimeout(() => setSaving(false), 1000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Configuração ImageFX</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Configure os cookies do Google ImageFX para geração de imagens
        </p>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#111111] p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
            <SettingsIcon className="size-5 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Cookies do ImageFX</h3>
            <p className="text-xs text-zinc-500">
              Cole os cookies do Google ImageFX (extraídos do navegador)
            </p>
          </div>
        </div>

        <textarea
          value={cookies}
          onChange={(e) => setCookies(e.target.value)}
          rows={6}
          placeholder="Cole os cookies aqui..."
          className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none resize-none"
        />

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-medium text-black hover:bg-[#C4A030] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
