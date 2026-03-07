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
import {
  Plus,
  Save,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Ban,
  HelpCircle,
  Trash2,
  Search,
} from "lucide-react";
import {
  getValidators,
  getValidatorTypes,
  updateValidator,
  createValidator,
} from "../actions";

type Validator = Awaited<ReturnType<typeof getValidators>>[0];

const TYPE_ICONS: Record<string, React.ElementType> = {
  all: ShieldCheck,
  forbidden_patterns: Ban,
  required_patterns: ShieldCheck,
  min_words: AlertTriangle,
};

const TYPE_INFO: Record<
  string,
  {
    label: string;
    description: string;
    howToUse: string;
  }
> = {
  forbidden_patterns: {
    label: "Padrões Proibidos",
    description: "Bloqueia roteiros que contenham certos padrões (HTML, Markdown, etc)",
    howToUse: "Use para garantir que o roteiro NÃO contenha elementos indesejados",
  },
  required_patterns: {
    label: "Padrões Obrigatórios",
    description: "Exige que o roteiro contenha certos padrões",
    howToUse: "Use para garantir que o roteiro TENHA elementos obrigatórios",
  },
  min_words: {
    label: "Mínimo de Palavras",
    description: "Garante que o roteiro tenha um número mínimo de palavras",
    howToUse: "Use para roteiros longos (ex: 6000 palavras para 30min de vídeo)",
  },
};

const TEMPLATES = [
  {
    name: "Bloquear HTML",
    type: "forbidden_patterns",
    config: '{"patterns": ["<[^>]+>"]}',
    error_message: "Roteiro contém tags HTML que não são permitidas",
  },
  {
    name: "Bloquear Markdown",
    type: "forbidden_patterns",
    config: '{"patterns": ["\\\\*\\\\*", "\\\\#", "\\\\`"]}',
    error_message: "Roteiro contém formatação Markdown",
  },
  {
    name: "Exigir Marcador de Voz",
    type: "required_patterns",
    config: '{"patterns": ["\\\\(voz:"]}',
    error_message: "Roteiro deve conter marcadores de voz",
  },
  {
    name: "Roteiro Mínimo 30min",
    type: "min_words",
    config: '{"minWords": 6000}',
    error_message: "Roteiro muito curto. Precisa de pelo menos 6000 palavras",
  },
];

export default function AdminValidatorsPage() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [types, setTypes] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState("all");
  const [selected, setSelected] = useState<Validator | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState<Record<string, unknown>>({});
  const [configObj, setConfigObj] = useState<Record<string, unknown>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, searchValue]);

  function loadData() {
    startTransition(async () => {
      const [data, typesData] = await Promise.all([
        getValidators(searchValue, selectedType),
        getValidatorTypes(),
      ]);
      setValidators(data);
      setTypes(typesData);
    });
  }

  function handleSelect(item: Validator) {
    setSelected(item);
    setEdited({ ...item });
    try {
      setConfigObj(JSON.parse(item.config || "{}"));
    } catch {
      setConfigObj({});
    }
  }

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      await updateValidator(selected.id, {
        ...edited,
        config: JSON.stringify(configObj),
      });
      loadData();
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const newItem = await createValidator();
      loadData();
      if (newItem) {
        setSelected(newItem as Validator);
        setEdited({ ...newItem });
        setConfigObj({});
      }
    });
  }

  function applyTemplate(template: (typeof TEMPLATES)[0]) {
    setEdited({
      ...edited,
      name: template.name,
      type: template.type,
      error_message: template.error_message,
    });
    try {
      setConfigObj(JSON.parse(template.config));
    } catch {
      setConfigObj({});
    }
  }

  function updateConfigField(key: string, value: unknown) {
    setConfigObj({ ...configObj, [key]: value });
  }

  function getPatterns(): string[] {
    const patterns = configObj.patterns;
    if (Array.isArray(patterns)) return patterns;
    return [];
  }

  function addPattern() {
    updateConfigField("patterns", [...getPatterns(), ""]);
  }

  function updatePattern(index: number, value: string) {
    const current = getPatterns();
    current[index] = value;
    updateConfigField("patterns", current);
  }

  function removePattern(index: number) {
    const current = getPatterns();
    current.splice(index, 1);
    updateConfigField("patterns", current);
  }

  const typeEntries = Object.entries(types);
  const currentTypeInfo = edited.type ? TYPE_INFO[String(edited.type)] : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Validators</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Regras de qualidade para roteiros
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
          Novo Validator
        </Button>
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 text-xs text-zinc-400 space-y-0.5">
        <p>Validators verificam o roteiro automaticamente antes de continuar o pipeline.</p>
        <p><span className="text-red-400">Severity error</span> = bloqueia pipeline | <span className="text-amber-400">warning</span> = só alerta</p>
      </div>

      {/* Type tabs */}
      {typeEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {typeEntries.map(([id, count]) => {
            const Icon = TYPE_ICONS[id] || ShieldCheck;
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
                {id === "all" ? "Todos" : TYPE_INFO[id]?.label || id.replace(/_/g, " ")}
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
      <div className="grid grid-cols-[260px_1fr] gap-4 h-[calc(100vh-320px)] min-h-[400px]">
        {/* List */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {isPending && validators.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : validators.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <ShieldCheck className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Nenhum validator</p>
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
              {validators.map((item) => (
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
                      className={`text-[10px] h-4 px-1.5 ${
                        item.severity === "error"
                          ? "border-red-500/30 text-red-400"
                          : "border-amber-500/30 text-amber-400"
                      }`}
                    >
                      {item.severity?.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] text-zinc-600 truncate">
                      {TYPE_INFO[item.type]?.label || item.type}
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
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {selected.name}
                  </h2>
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

              {/* Templates */}
              <div className="mb-5 p-3 rounded-lg border border-white/5 bg-[#0A0A0A]">
                <p className="text-xs text-zinc-500 mb-2">
                  Templates prontos (clique para aplicar)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => applyTemplate(t)}
                      className="px-2 py-1 rounded border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-xs transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Nome</Label>
                    <Input
                      value={String(edited.name || "")}
                      onChange={(e) =>
                        setEdited({ ...edited, name: e.target.value })
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">
                      Tipo de Validação
                    </Label>
                    <Select
                      value={String(edited.type || "")}
                      onValueChange={(v) => {
                        setEdited({ ...edited, type: v });
                        setConfigObj({});
                      }}
                    >
                      <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10">
                        <SelectItem
                          value="forbidden_patterns"
                          className="text-zinc-200 focus:bg-white/10 text-xs"
                        >
                          Padrões Proibidos
                        </SelectItem>
                        <SelectItem
                          value="required_patterns"
                          className="text-zinc-200 focus:bg-white/10 text-xs"
                        >
                          Padrões Obrigatórios
                        </SelectItem>
                        <SelectItem
                          value="min_words"
                          className="text-zinc-200 focus:bg-white/10 text-xs"
                        >
                          Mínimo de Palavras
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Type explanation */}
                {currentTypeInfo && (
                  <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-zinc-200">
                          {currentTypeInfo.label}
                        </p>
                        <p className="text-zinc-400 mt-0.5">
                          {currentTypeInfo.howToUse}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Config */}
                <div className="border-t border-white/5 pt-4">
                  <Label className="text-xs text-zinc-400 block mb-3">
                    Configuração
                  </Label>

                  {(edited.type === "forbidden_patterns" ||
                    edited.type === "required_patterns") && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">
                        Padrões (regex) a verificar:
                      </p>
                      {getPatterns().map((pattern, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={pattern}
                            onChange={(e) => updatePattern(index, e.target.value)}
                            placeholder="Ex: <[^>]+> (HTML)"
                            className="bg-[#0A0A0A] border-white/10 text-white font-mono text-xs"
                          />
                          <button
                            onClick={() => removePattern(index)}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addPattern}
                        className="border-white/10 text-zinc-400 hover:text-white text-xs"
                      >
                        + Adicionar Padrão
                      </Button>
                    </div>
                  )}

                  {edited.type === "min_words" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-400">
                        Número mínimo de palavras
                      </Label>
                      <Input
                        type="number"
                        value={String(configObj.minWords || "")}
                        onChange={(e) =>
                          updateConfigField(
                            "minWords",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        placeholder="6000"
                        className="bg-[#0A0A0A] border-white/10 text-white"
                      />
                      <p className="text-[11px] text-zinc-600">
                        ~200 palavras = 1 minuto de vídeo
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Mensagem de Erro
                  </Label>
                  <Input
                    value={String(edited.error_message || "")}
                    onChange={(e) =>
                      setEdited({ ...edited, error_message: e.target.value })
                    }
                    placeholder="Mensagem exibida quando a validação falha"
                    className="bg-[#0A0A0A] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Severity (Gravidade)
                  </Label>
                  <Select
                    value={String(edited.severity || "error")}
                    onValueChange={(v) => setEdited({ ...edited, severity: v })}
                  >
                    <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10">
                      <SelectItem
                        value="error"
                        className="text-zinc-200 focus:bg-white/10 text-xs"
                      >
                        Error — Bloqueia o pipeline
                      </SelectItem>
                      <SelectItem
                        value="warning"
                        className="text-zinc-200 focus:bg-white/10 text-xs"
                      >
                        Warning — Apenas alerta, continua
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      selected.severity === "error"
                        ? "border-red-500/30 text-red-400"
                        : "border-amber-500/30 text-amber-400"
                    }`}
                  >
                    {selected.severity?.toUpperCase()}
                  </Badge>
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
              <ShieldCheck className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Selecione um validator para editar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
