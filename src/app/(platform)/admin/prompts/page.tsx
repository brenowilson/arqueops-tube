"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  FileText,
  Sparkles,
  Code,
  BarChart3,
  Save,
  Loader2,
  Download,
  Search,
} from "lucide-react";
import {
  getPrompts,
  getPromptCategories,
  updatePrompt,
  createPrompt,
} from "../actions";

type Prompt = Awaited<ReturnType<typeof getPrompts>>[0];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  all: FileText,
  title: Sparkles,
  brief: FileText,
  script: Code,
  analysis: BarChart3,
};

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [versionFilter, setVersionFilter] = useState<
    "all" | "v1" | "v2+" | "inactive"
  >("all");
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState<Record<string, unknown>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchValue]);

  function loadData() {
    startTransition(async () => {
      const [promptsData, categoriesData] = await Promise.all([
        getPrompts(searchValue, selectedCategory),
        getPromptCategories(),
      ]);
      setPrompts(promptsData);
      setCategories(categoriesData);
    });
  }

  function handleSelect(prompt: Prompt) {
    setSelectedPrompt(prompt);
    setEdited({ ...prompt });
  }

  function handleSave() {
    if (!selectedPrompt) return;
    startTransition(async () => {
      await updatePrompt(selectedPrompt.id, edited);
      loadData();
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const newPrompt = await createPrompt({});
      loadData();
      if (newPrompt) {
        setSelectedPrompt(newPrompt as Prompt);
        setEdited({ ...newPrompt });
      }
    });
  }

  function handleDownload() {
    if (!selectedPrompt) return;
    const content = `# SYSTEM PROMPT\n${selectedPrompt.system_template || ""}\n\n---\n\n# USER TEMPLATE\n${selectedPrompt.user_template || ""}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPrompt.key}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filteredPrompts = prompts.filter((p) => {
    if (versionFilter === "all") return true;
    if (versionFilter === "v1") return p.version === 1;
    if (versionFilter === "v2+") return p.version >= 2;
    if (versionFilter === "inactive") return !p.is_active;
    return true;
  });

  const categoryEntries = Object.entries(categories);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Biblioteca de Prompts
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gerenciamento de prompts de IA
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
          Novo Prompt
        </Button>
      </div>

      {/* Category tabs */}
      {categoryEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categoryEntries.map(([id, count]) => {
            const Icon = CATEGORY_ICONS[id] || FileText;
            return (
              <button
                key={id}
                onClick={() => setSelectedCategory(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === id
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar prompts..."
            className="pl-9 bg-[#111111] border-white/5 text-white placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "v2+", "v1", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setVersionFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                versionFilter === f
                  ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                  : "bg-[#111111] text-zinc-500 hover:text-zinc-300 border border-white/5"
              }`}
            >
              {f === "all" ? "Todos" : f === "v2+" ? "v2+ Novos" : f === "v1" ? "v1" : "Inativos"}
            </button>
          ))}
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-[320px_1fr] gap-4 h-[calc(100vh-280px)] min-h-[400px]">
        {/* List */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {isPending && prompts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <FileText className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Nenhum prompt encontrado</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreate}
                className="border-white/10 text-zinc-400"
              >
                Criar Prompt
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => handleSelect(prompt)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                    selectedPrompt?.id === prompt.id
                      ? "bg-[#D4AF37]/5 border-l-2 border-[#D4AF37]"
                      : ""
                  } ${!prompt.is_active ? "opacity-50" : ""} ${prompt.version >= 2 && prompt.is_active ? "border-l-2 border-emerald-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white line-clamp-1">
                      {prompt.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] px-1.5 h-4 ${
                        prompt.is_active
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {prompt.is_active ? "ATIVO" : "INATIVO"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 border-white/10 text-zinc-500"
                    >
                      v{prompt.version}
                    </Badge>
                    <span className="text-[11px] text-zinc-600 truncate">
                      {prompt.key}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {selectedPrompt ? (
            <div className="p-5">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold text-white">
                      {selectedPrompt.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-white/10 text-zinc-500"
                    >
                      v{selectedPrompt.version}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        selectedPrompt.is_active
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {selectedPrompt.is_active ? "ATIVO" : "INATIVO"}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{selectedPrompt.key}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                    title="Download .md"
                    className="border-white/10 text-zinc-400 hover:text-white"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
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
                    <Label className="text-xs text-zinc-400">Categoria</Label>
                    <Input
                      value={String(edited.category || "")}
                      onChange={(e) =>
                        setEdited({ ...edited, category: e.target.value })
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Model</Label>
                    <Input
                      value={String(edited.model || "")}
                      onChange={(e) =>
                        setEdited({ ...edited, model: e.target.value })
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Max Tokens</Label>
                    <Input
                      type="number"
                      value={Number(edited.max_tokens || 0)}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          max_tokens: parseInt(e.target.value),
                        })
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={Number(edited.temperature || 0)}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          temperature: parseFloat(e.target.value),
                        })
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">System Prompt</Label>
                  <Textarea
                    rows={10}
                    value={String(edited.system_template || "")}
                    onChange={(e) =>
                      setEdited({ ...edited, system_template: e.target.value })
                    }
                    className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">User Template</Label>
                  <Textarea
                    rows={10}
                    value={String(edited.user_template || "")}
                    onChange={(e) =>
                      setEdited({ ...edited, user_template: e.target.value })
                    }
                    className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-6">
              <FileText className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Selecione um prompt para editar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
