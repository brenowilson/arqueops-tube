"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ChefHat,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
import { getRecipes, updateRecipe, createRecipe } from "../actions";

type Recipe = Awaited<ReturnType<typeof getRecipes>>[0];

const STEP_TYPES = [
  { value: "llm", label: "LLM (Geração de texto)", icon: "🤖" },
  { value: "tts", label: "TTS (Texto para áudio)", icon: "🎙️" },
  { value: "render", label: "Render (Vídeo)", icon: "🎬" },
  { value: "export", label: "Export (Pacote)", icon: "📦" },
];

const PREDEFINED_STEPS = [
  { key: "ideacao", type: "llm", label: "Ideação", description: "Gera ideias baseadas no tema" },
  { key: "titulo", type: "llm", label: "Título", description: "Gera título otimizado" },
  { key: "planejamento", type: "llm", label: "Planejamento", description: "Planeja estrutura do roteiro" },
  { key: "roteiro", type: "llm", label: "Roteiro", description: "Gera roteiro completo" },
  { key: "parse_ssml", type: "llm", label: "Parse SSML", description: "Converte roteiro para SSML" },
  { key: "tts", type: "tts", label: "TTS", description: "Gera áudio narrado" },
  { key: "renderizacao", type: "render", label: "Renderização", description: "Gera vídeo final" },
  { key: "exportacao", type: "export", label: "Exportação", description: "Empacota arquivos" },
  { key: "miniaturas", type: "llm", label: "Miniaturas", description: "Gera thumbnails" },
  { key: "descricao", type: "llm", label: "Descrição", description: "Gera descrição YouTube" },
];

interface PipelineStep {
  key: string;
  type: string;
}

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState<Record<string, unknown>>({});
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function loadData() {
    startTransition(async () => {
      const data = await getRecipes(searchValue);
      setRecipes(data);
    });
  }

  function handleSelect(item: Recipe) {
    setSelected(item);
    setEdited({ ...item });
    try {
      const raw = item.steps || item.pipeline;
      setPipelineSteps(typeof raw === "string" ? JSON.parse(raw || "[]") : (Array.isArray(raw) ? raw : []));
    } catch {
      setPipelineSteps([]);
    }
  }

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      await updateRecipe(selected.id, {
        ...edited,
        steps: pipelineSteps,
      });
      loadData();
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const newItem = await createRecipe();
      loadData();
      if (newItem) {
        setSelected(newItem as Recipe);
        setEdited({ ...newItem });
        setPipelineSteps([]);
      }
    });
  }

  function addPredefinedStep(stepKey: string) {
    const predefined = PREDEFINED_STEPS.find((s) => s.key === stepKey);
    if (predefined && !pipelineSteps.find((s) => s.key === predefined.key)) {
      setPipelineSteps([...pipelineSteps, { key: predefined.key, type: predefined.type }]);
    }
  }

  function addCustomStep() {
    setPipelineSteps([...pipelineSteps, { key: `custom_${Date.now()}`, type: "llm" }]);
  }

  function removeStep(index: number) {
    const newSteps = [...pipelineSteps];
    newSteps.splice(index, 1);
    setPipelineSteps(newSteps);
  }

  function moveStepUp(index: number) {
    if (index === 0) return;
    const newSteps = [...pipelineSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setPipelineSteps(newSteps);
  }

  function moveStepDown(index: number) {
    if (index === pipelineSteps.length - 1) return;
    const newSteps = [...pipelineSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setPipelineSteps(newSteps);
  }

  function updateStep(index: number, field: keyof PipelineStep, value: string) {
    const newSteps = [...pipelineSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setPipelineSteps(newSteps);
  }

  const getStepTypeIcon = (type: string) =>
    STEP_TYPES.find((t) => t.value === type)?.icon || "⚙️";

  const availableToAdd = PREDEFINED_STEPS.filter(
    (ps) => !pipelineSteps.find((s) => s.key === ps.key),
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Recipes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Pipelines de produção de vídeo
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
          Nova Recipe
        </Button>
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 text-xs text-zinc-400">
        <span className="text-[#D4AF37] font-medium">O que é uma Recipe?</span>{" "}
        Define a ordem das etapas de produção: ideia, título, roteiro, áudio,
        vídeo. Cada etapa executa em sequência.
      </div>

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
      <div className="grid grid-cols-[280px_1fr] gap-4 h-[calc(100vh-300px)] min-h-[400px]">
        {/* List */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {isPending && recipes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <ChefHat className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Nenhuma recipe</p>
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
              {recipes.map((item) => {
                const steps = (() => {
                  try {
                    const raw = item.steps || item.pipeline;
                    return (Array.isArray(raw) ? raw : JSON.parse(raw || "[]")).length;
                  } catch {
                    return 0;
                  }
                })();
                return (
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
                        v{item.version}
                      </Badge>
                      <span className="text-[11px] text-zinc-600">
                        {steps} etapas
                      </span>
                    </div>
                  </button>
                );
              })}
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
                      v{selected.version}
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
                    <Label className="text-xs text-zinc-400">Key</Label>
                    <Input
                      value={String(edited.key || "")}
                      onChange={(e) =>
                        setEdited({ ...edited, key: e.target.value })
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Descrição</Label>
                  <Textarea
                    value={String(edited.description || "")}
                    onChange={(e) =>
                      setEdited({ ...edited, description: e.target.value })
                    }
                    placeholder="Ex: Pipeline para vídeos do canal"
                    className="bg-[#0A0A0A] border-white/10 text-white resize-none"
                    rows={2}
                  />
                </div>

                {/* Pipeline editor */}
                <div className="border-t border-white/5 pt-4">
                  <p className="text-sm font-medium text-white mb-3">
                    Pipeline ({pipelineSteps.length} etapas)
                  </p>

                  <div className="space-y-2 mb-4">
                    {pipelineSteps.map((step, index) => (
                      <div
                        key={`${step.key}-${index}`}
                        className="flex items-center gap-2 p-3 bg-[#0A0A0A] rounded-lg border border-white/5 group"
                      >
                        <div className="flex flex-col gap-0.5 opacity-40 group-hover:opacity-100">
                          <button
                            onClick={() => moveStepUp(index)}
                            disabled={index === 0}
                            className="hover:text-white text-zinc-500 disabled:opacity-20"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveStepDown(index)}
                            disabled={index === pipelineSteps.length - 1}
                            className="hover:text-white text-zinc-500 disabled:opacity-20"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="w-7 h-7 rounded bg-[#D4AF37]/10 flex items-center justify-center text-xs font-mono text-[#D4AF37] shrink-0">
                          {index + 1}
                        </div>

                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={step.key}
                            onChange={(e) =>
                              updateStep(index, "key", e.target.value)
                            }
                            placeholder="nome_step"
                            className="bg-[#111111] border-white/10 text-white font-mono text-xs"
                          />
                          <Select
                            value={step.type}
                            onValueChange={(v) => updateStep(index, "type", v)}
                          >
                            <SelectTrigger className="bg-[#111111] border-white/10 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1A1A1A] border-white/10">
                              {STEP_TYPES.map((t) => (
                                <SelectItem
                                  key={t.value}
                                  value={t.value}
                                  className="text-zinc-200 focus:bg-white/10 text-xs"
                                >
                                  {t.icon} {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-[11px] text-zinc-500 flex items-center truncate">
                            {PREDEFINED_STEPS.find((s) => s.key === step.key)
                              ?.description || "Step customizado"}
                          </div>
                        </div>

                        <button
                          onClick={() => removeStep(index)}
                          className="text-zinc-600 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {pipelineSteps.length === 0 && (
                      <div className="text-center py-8 text-zinc-600 text-sm">
                        Pipeline vazia. Adicione etapas abaixo.
                      </div>
                    )}
                  </div>

                  {/* Add steps */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">Adicionar Etapa</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableToAdd.slice(0, 8).map((step) => (
                        <button
                          key={step.key}
                          onClick={() => addPredefinedStep(step.key)}
                          className="px-2.5 py-1 rounded border border-white/10 bg-[#0A0A0A] text-zinc-400 hover:text-white hover:border-white/20 text-xs transition-colors"
                        >
                          {getStepTypeIcon(step.type)} {step.label}
                        </button>
                      ))}
                      <button
                        onClick={addCustomStep}
                        className="px-2.5 py-1 rounded border border-dashed border-white/10 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                      >
                        + Customizado
                      </button>
                    </div>
                  </div>
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
              <ChefHat className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Selecione uma recipe para editar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
