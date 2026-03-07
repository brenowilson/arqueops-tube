"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  Mic,
  Video,
  Sliders,
  Search,
  HelpCircle,
} from "lucide-react";
import {
  getPresets,
  getPresetCounts,
  updatePreset,
  type PresetType,
} from "../actions";

type Preset = Awaited<ReturnType<typeof getPresets>>[0];

const TYPE_ICONS: Record<string, React.ElementType> = {
  all: Sliders,
  voice: Mic,
  video: Video,
  effects: Sliders,
  ssml: Sliders,
};

const VOICE_NAMES = [
  { value: "pt-BR-ThalitaMultilingualNeural", label: "Thalita Multilingual (BR)" },
  { value: "pt-BR-FranciscaNeural", label: "Francisca (Brasil)" },
  { value: "pt-BR-AntonioNeural", label: "Antonio (Brasil)" },
  { value: "pt-BR-BrendaNeural", label: "Brenda (Brasil)" },
  { value: "es-ES-XimenaMultilingualNeural", label: "Ximena Multilingual (ES)" },
  { value: "es-MX-DaliaNeural", label: "Dalia (México)" },
  { value: "es-MX-JorgeNeural", label: "Jorge (México)" },
  { value: "en-US-AvaMultilingualNeural", label: "Ava Multilingual (US)" },
  { value: "en-US-AndrewMultilingualNeural", label: "Andrew Multilingual (US)" },
];

const RATE_OPTIONS = [
  { value: "0.8", label: "0.8x — Pouco lento" },
  { value: "0.9", label: "0.9x — Quase normal" },
  { value: "1.0", label: "1.0x — Normal" },
  { value: "1.1", label: "1.1x — Pouco rápido" },
  { value: "1.2", label: "1.2x — Rápido" },
  { value: "1.5", label: "1.5x — Muito rápido" },
];

const PITCH_OPTIONS = [
  { value: "-20%", label: "-20% — Grave" },
  { value: "-10%", label: "-10%" },
  { value: "0%", label: "0% — Normal" },
  { value: "+10%", label: "+10%" },
  { value: "+20%", label: "+20% — Agudo" },
];

const VIDEO_RESOLUTIONS = [
  { value: "1280:720", label: "720p HD" },
  { value: "1920:1080", label: "1080p Full HD" },
  { value: "2560:1440", label: "1440p 2K" },
  { value: "3840:2160", label: "4K UHD" },
];

const VIDEO_ENCODERS = [
  { value: "libx264", label: "libx264 (CPU)" },
  { value: "h264_videotoolbox", label: "VideoToolbox (Mac GPU)" },
];

const VIDEO_BITRATES = [
  { value: "2M", label: "2 Mbps — baixa" },
  { value: "4M", label: "4 Mbps — boa" },
  { value: "8M", label: "8 Mbps — alta" },
  { value: "12M", label: "12 Mbps — máxima" },
];

const VIDEO_FPS = [
  { value: "24", label: "24 fps (Cinema)" },
  { value: "30", label: "30 fps (Padrão)" },
  { value: "60", label: "60 fps (Suave)" },
];

function FieldWithHelp({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs text-zinc-400">{label}</Label>
        <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
          <HelpCircle className="w-2.5 h-2.5" />
          {help}
        </span>
      </div>
      {children}
    </div>
  );
}

function AdminPresetsContent() {
  const searchParams = useSearchParams();
  const forcedType = searchParams.get("type");

  const [presets, setPresets] = useState<Preset[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState<string>(forcedType || "all");
  const [selected, setSelected] = useState<Preset | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (forcedType) {
      setSelectedType(forcedType);
      setSelected(null);
    }
  }, [forcedType]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, searchValue]);

  function loadData() {
    setError(null);
    startTransition(async () => {
      try {
        const type = selectedType === "all" ? undefined : (selectedType as PresetType);
        const [data, countsData] = await Promise.all([
          getPresets(type, searchValue),
          getPresetCounts(),
        ]);
        setPresets(data);
        setCounts(countsData);
      } catch (e) {
        setError(String(e));
      }
    });
  }

  function handleSelect(item: Preset) {
    setSelected(item);
    setEdited({ ...item });
  }

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await updatePreset(selected.preset_type as PresetType, selected.id, edited);
        loadData();
      } catch (e) {
        setError(String(e));
      }
    });
  }

  const pageTitle =
    forcedType === "voice"
      ? "Vozes Disponíveis"
      : forcedType === "video"
        ? "Resoluções de Vídeo"
        : "Presets";

  const renderVoiceForm = () => {
    const currentVoice = String(edited.voice_name || "");
    const voiceInList = VOICE_NAMES.some((v) => v.value === currentVoice);

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-zinc-400 grid grid-cols-2 gap-1">
          <p><span className="text-zinc-300">Voz:</span> {VOICE_NAMES.find(v => v.value === currentVoice)?.label || currentVoice || "—"}</p>
          <p><span className="text-zinc-300">Idioma:</span> {String(edited.language || "—")}</p>
          <p><span className="text-zinc-300">Rate:</span> {String(edited.rate || 1.0)}x</p>
          <p><span className="text-zinc-300">Pitch:</span> {String(edited.pitch || "0%")}</p>
        </div>

        <FieldWithHelp label="Voz Azure" help="Selecione ou digite abaixo">
          <Select
            value={voiceInList ? currentVoice : ""}
            onValueChange={(v) => setEdited({ ...edited, voice_name: v })}
          >
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
              <SelectValue placeholder={currentVoice || "Selecione"} />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {VOICE_NAMES.map((v) => (
                <SelectItem key={v.value} value={v.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWithHelp>

        <FieldWithHelp label="Ou digite manualmente" help="Qualquer voz Azure válida">
          <Input
            value={currentVoice}
            onChange={(e) => setEdited({ ...edited, voice_name: e.target.value })}
            placeholder="es-ES-XimenaMultilingualNeural"
            className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm"
          />
        </FieldWithHelp>

        <FieldWithHelp label="Idioma" help="Código do idioma">
          <Input
            value={String(edited.language || "")}
            onChange={(e) => setEdited({ ...edited, language: e.target.value })}
            placeholder="es-ES, pt-BR, en-US..."
            className="bg-[#0A0A0A] border-white/10 text-white"
          />
        </FieldWithHelp>

        <div className="grid grid-cols-2 gap-4">
          <FieldWithHelp label="Rate (Velocidade)" help="0.5x a 2.0x">
            <Select
              value={String(edited.rate || "1.0")}
              onValueChange={(v) => setEdited({ ...edited, rate: parseFloat(v) })}
            >
              <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                {RATE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWithHelp>

          <FieldWithHelp label="Pitch (Tom)" help="-30% a +30%">
            <Select
              value={String(edited.pitch || "0%")}
              onValueChange={(v) => setEdited({ ...edited, pitch: v })}
            >
              <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                {PITCH_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWithHelp>
        </div>
      </div>
    );
  };

  const renderVideoForm = () => (
    <div className="space-y-4">
      <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-zinc-400 grid grid-cols-2 gap-1">
        <p><span className="text-zinc-300">Resolução:</span> {String(edited.scale || "—")}</p>
        <p><span className="text-zinc-300">Encoder:</span> {String(edited.encoder || "—")}</p>
        <p><span className="text-zinc-300">Bitrate:</span> {String(edited.bitrate || "—")}</p>
        <p><span className="text-zinc-300">FPS:</span> {String(edited.fps || "—")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldWithHelp label="Resolução" help="Tamanho do vídeo">
          <Select
            value={String(edited.scale || "1920:1080")}
            onValueChange={(v) => setEdited({ ...edited, scale: v })}
          >
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {VIDEO_RESOLUTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWithHelp>

        <FieldWithHelp label="Encoder" help="CPU vs GPU">
          <Select
            value={String(edited.encoder || "libx264")}
            onValueChange={(v) => setEdited({ ...edited, encoder: v })}
          >
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {VIDEO_ENCODERS.map((e) => (
                <SelectItem key={e.value} value={e.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWithHelp>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldWithHelp label="Bitrate" help="Qualidade vs tamanho">
          <Select
            value={String(edited.bitrate || "4M")}
            onValueChange={(v) => setEdited({ ...edited, bitrate: v })}
          >
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {VIDEO_BITRATES.map((b) => (
                <SelectItem key={b.value} value={b.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWithHelp>

        <FieldWithHelp label="FPS" help="Quadros por segundo">
          <Select
            value={String(edited.fps || "30")}
            onValueChange={(v) => setEdited({ ...edited, fps: parseInt(v) })}
          >
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {VIDEO_FPS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWithHelp>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldWithHelp label="Pixel Format" help="Formato de cor">
          <Input
            value={String(edited.pixel_format || "yuv420p")}
            onChange={(e) => setEdited({ ...edited, pixel_format: e.target.value })}
            className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm"
          />
        </FieldWithHelp>
        <FieldWithHelp label="Audio Codec" help="Codec de áudio">
          <Input
            value={String(edited.audio_codec || "aac")}
            onChange={(e) => setEdited({ ...edited, audio_codec: e.target.value })}
            className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm"
          />
        </FieldWithHelp>
      </div>
    </div>
  );

  const renderGenericForm = () => (
    <div className="p-4 rounded-lg bg-[#0A0A0A] border border-white/5">
      <p className="text-[10px] text-zinc-600 uppercase mb-2">Configuração</p>
      <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap">
        {JSON.stringify(
          Object.fromEntries(
            Object.entries(selected || {}).filter(
              ([k]) =>
                !["id", "key", "slug", "name", "description", "preset_type", "created_at", "is_active"].includes(k),
            ),
          ),
          null,
          2,
        )}
      </pre>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{pageTitle}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {forcedType === "voice"
              ? "Gerencie as vozes disponíveis para narração"
              : forcedType === "video"
                ? "Gerencie as resoluções e formatos de vídeo"
                : "Configurações gerais de voz e vídeo"}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Type tabs - only show if no forced type */}
      {!forcedType && Object.entries(counts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(counts).map(([id, count]) => {
            const Icon = TYPE_ICONS[id] || Sliders;
            return (
              <button
                key={id}
                onClick={() => setSelectedType(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedType === id
                    ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                    : "bg-[#111111] text-zinc-400 border border-white/5 hover:border-white/10 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {id === "all" ? "Todos" : id.charAt(0).toUpperCase() + id.slice(1)}
                <span className="ml-1 text-zinc-500">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Buscar..."
          className="pl-9 bg-[#111111] border-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Split view */}
      <div className="grid grid-cols-[260px_1fr] gap-4 h-[calc(100vh-300px)] min-h-[400px]">
        {/* List */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {isPending && presets.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : presets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
              <Sliders className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Nenhum preset</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {presets.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                    selected?.id === item.id
                      ? "bg-[#D4AF37]/5 border-l-2 border-[#D4AF37]"
                      : ""
                  }`}
                >
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 border-white/10 text-zinc-500"
                    >
                      {item.preset_type}
                    </Badge>
                    <span className="text-[11px] text-zinc-600 truncate">
                      {item.key}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {selected ? (
            <div className="p-5">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold text-white">
                      {selected.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-white/10 text-zinc-500"
                    >
                      {selected.preset_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{selected.key}</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                  className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A227]"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </div>

              <div className="space-y-5">
                <FieldWithHelp label="Nome" help="Nome amigável">
                  <Input
                    value={String(edited.name || "")}
                    onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                    className="bg-[#0A0A0A] border-white/10 text-white"
                  />
                </FieldWithHelp>

                <div className="border-t border-white/5 pt-4">
                  <p className="text-sm font-medium text-zinc-300 mb-4">
                    {selected.preset_type === "voice"
                      ? "Configurações de Voz"
                      : selected.preset_type === "video"
                        ? "Configurações de Vídeo"
                        : "Configurações"}
                  </p>

                  {selected.preset_type === "voice" && renderVoiceForm()}
                  {selected.preset_type === "video" && renderVideoForm()}
                  {selected.preset_type !== "voice" &&
                    selected.preset_type !== "video" &&
                    renderGenericForm()}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      selected.is_active
                        ? "border-emerald-500/30 text-emerald-400"
                        : "border-zinc-700 text-zinc-500"
                    }`}
                  >
                    {selected.is_active ? "ATIVO" : "INATIVO"}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-6">
              <Sliders className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Selecione um preset para editar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPresetsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <AdminPresetsContent />
    </Suspense>
  );
}
