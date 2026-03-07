"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Plus, Save, Loader2, Server, Cpu, Mic, Search, HelpCircle } from "lucide-react";
import { getProviders, getProviderTypes, updateProvider, createProvider } from "../actions";

type Provider = Awaited<ReturnType<typeof getProviders>>[0];

const TYPE_ICONS: Record<string, React.ElementType> = {
  all: Server,
  llm: Cpu,
  tts: Mic,
};

const CLAUDE_MODELS = [
  { value: "claude-opus-4-5-20251101", label: "Claude 4.5 Opus (Nov 2025)", maxOutput: 32000 },
  { value: "claude-sonnet-4-5-20250514", label: "Claude 4.5 Sonnet", maxOutput: 64000 },
  { value: "claude-opus-4-20250514", label: "Claude 4 Opus", maxOutput: 32000 },
  { value: "claude-sonnet-4-20250514", label: "Claude 4 Sonnet", maxOutput: 64000 },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet v2", maxOutput: 8192 },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", maxOutput: 8192 },
];

const TEMPERATURE_OPTIONS = [
  { value: "0.0", label: "0.0 — Determinístico" },
  { value: "0.3", label: "0.3 — Moderado" },
  { value: "0.5", label: "0.5 — Equilibrado" },
  { value: "0.7", label: "0.7 — Criativo" },
  { value: "1.0", label: "1.0 — Máximo" },
];

const AZURE_OUTPUT_FORMATS = [
  { value: "audio-16khz-128kbitrate-mono-mp3", label: "MP3 128kbps 16kHz (padrão)" },
  { value: "audio-24khz-160kbitrate-mono-mp3", label: "MP3 160kbps 24kHz (alta)" },
  { value: "audio-48khz-192kbitrate-mono-mp3", label: "MP3 192kbps 48kHz (máxima)" },
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

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [types, setTypes] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState("all");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, searchValue]);

  function loadData() {
    setError(null);
    startTransition(async () => {
      try {
        const [data, typesData] = await Promise.all([
          getProviders(searchValue, selectedType),
          getProviderTypes(),
        ]);
        setProviders(data);
        setTypes(typesData);
      } catch (e) {
        setError(String(e));
      }
    });
  }

  function handleSelect(item: Provider) {
    setSelected(item);
    setEdited({ ...item });
  }

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await updateProvider(selected.id, edited);
        setError(null);
        loadData();
      } catch (e) {
        setError(String(e));
      }
    });
  }

  function handleCreate() {
    startTransition(async () => {
      try {
        const newItem = await createProvider();
        loadData();
        if (newItem) {
          setSelected(newItem as Provider);
          setEdited({ ...newItem });
        }
      } catch (e) {
        setError(String(e));
      }
    });
  }

  const getConfig = (): Record<string, unknown> => {
    try {
      return typeof edited.config === "string"
        ? JSON.parse(edited.config || "{}")
        : ((edited.config as Record<string, unknown>) || {});
    } catch {
      return {};
    }
  };

  const updateConfig = (key: string, value: unknown) => {
    const config = getConfig();
    config[key] = value;
    setEdited({ ...edited, config: JSON.stringify(config) });
  };

  const typeEntries = Object.entries(types);

  const renderLLMConfig = () => {
    const config = getConfig();
    const currentModel = String(config.default_model || config.model || "");

    return (
      <div className="space-y-4">
        <FieldWithHelp label="Modelo Claude" help="Selecione o modelo">
          <Select
            value={currentModel}
            onValueChange={(v) => updateConfig("default_model", v)}
          >
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {CLAUDE_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWithHelp>

        <FieldWithHelp label="Ou digite manualmente" help="Para modelos não listados">
          <Input
            value={String(config.default_model || "")}
            onChange={(e) => updateConfig("default_model", e.target.value)}
            placeholder="claude-opus-4-5-20251101"
            className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm"
          />
        </FieldWithHelp>

        <div className="grid grid-cols-2 gap-4">
          <FieldWithHelp label="Temperature" help="Criatividade">
            <Select
              value={String(config.temperature || "0.7")}
              onValueChange={(v) => updateConfig("temperature", parseFloat(v))}
            >
              <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                {TEMPERATURE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWithHelp>

          <FieldWithHelp label="Max Tokens" help="Tamanho resposta">
            <Input
              type="number"
              value={Number(config.max_tokens || config.maxTokens || 4096)}
              onChange={(e) => updateConfig("max_tokens", parseInt(e.target.value))}
              className="bg-[#0A0A0A] border-white/10 text-white"
            />
          </FieldWithHelp>
        </div>
      </div>
    );
  };

  const renderTTSConfig = () => {
    const config = getConfig();

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-zinc-400">
          As vozes Azure estão cadastradas no banco de dados como presets.
          Selecione a voz em <strong className="text-zinc-200">Admin &gt; Presets</strong>.
        </div>

        <FieldWithHelp label="Formato de Saída" help="Qualidade do áudio">
          <Select
            value={String(config.outputFormat || "audio-24khz-160kbitrate-mono-mp3")}
            onValueChange={(v) => updateConfig("outputFormat", v)}
          >
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {AZURE_OUTPUT_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-zinc-200 focus:bg-white/10 text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWithHelp>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Providers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Serviços externos: LLM (Claude) e TTS (Azure)
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A227]"
          onClick={handleCreate}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Novo
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Type tabs */}
      {typeEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {typeEntries.map(([id, count]) => {
            const Icon = TYPE_ICONS[id] || Server;
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
                {id === "all" ? "Todos" : id.toUpperCase()}
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
          {isPending && providers.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <Server className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Nenhum provider</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreate}
                className="border-white/10 text-zinc-400"
              >
                Criar
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {providers.map((item) => (
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
                      {item.type?.toUpperCase()}
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
                      {selected.type?.toUpperCase()}
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
                <div className="grid grid-cols-2 gap-4">
                  <FieldWithHelp label="Nome" help="Nome amigável">
                    <Input
                      value={String(edited.name || "")}
                      onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                      className="bg-[#0A0A0A] border-white/10 text-white"
                    />
                  </FieldWithHelp>
                  <FieldWithHelp label="Tipo" help="LLM ou TTS">
                    <Select
                      value={String(edited.type || "")}
                      onValueChange={(v) => setEdited({ ...edited, type: v })}
                    >
                      <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10">
                        <SelectItem value="llm" className="text-zinc-200 focus:bg-white/10">LLM (Texto)</SelectItem>
                        <SelectItem value="tts" className="text-zinc-200 focus:bg-white/10">TTS (Áudio)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldWithHelp>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <p className="text-sm font-medium text-zinc-300 mb-4">
                    {selected.type === "llm"
                      ? "Configurações Claude"
                      : "Configurações Azure TTS"}
                  </p>
                  {selected.type === "llm" && renderLLMConfig()}
                  {selected.type === "tts" && renderTTSConfig()}
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
              <Server className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Selecione um provider para editar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
