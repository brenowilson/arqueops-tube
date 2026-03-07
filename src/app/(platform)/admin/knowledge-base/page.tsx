"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Save,
  Loader2,
  BookOpen,
  FileText,
  Lightbulb,
  Download,
  Search,
} from "lucide-react";
import {
  getKnowledgeBase,
  getKnowledgeTiers,
  updateKnowledge,
  createKnowledge,
} from "../actions";

type Knowledge = Awaited<ReturnType<typeof getKnowledgeBase>>[0];

const TIER_ICONS: Record<string, React.ElementType> = {
  all: BookOpen,
  tier1: FileText,
  tier2: Lightbulb,
  tier3: BookOpen,
};

const TIER_COLORS: Record<string, string> = {
  tier1: "border-red-500/30 text-red-400 bg-red-500/10",
  tier2: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  tier3: "border-blue-500/30 text-blue-400 bg-blue-500/10",
};

export default function AdminKnowledgeBasePage() {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [tiers, setTiers] = useState<Record<string, number>>({});
  const [selectedTier, setSelectedTier] = useState("all");
  const [selected, setSelected] = useState<Knowledge | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState<Record<string, unknown>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier, searchValue]);

  function loadData() {
    startTransition(async () => {
      const [data, tiersData] = await Promise.all([
        getKnowledgeBase(searchValue, selectedTier),
        getKnowledgeTiers(),
      ]);
      setItems(data);
      setTiers(tiersData);
    });
  }

  function handleSelect(item: Knowledge) {
    setSelected(item);
    setEdited({ ...item });
  }

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      await updateKnowledge(selected.id, edited);
      loadData();
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const newItem = await createKnowledge();
      loadData();
      if (newItem) {
        setSelected(newItem as Knowledge);
        setEdited({ ...newItem });
      }
    });
  }

  function handleDownload() {
    if (!selected) return;
    const blob = new Blob([String(selected.content || "")], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.key}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const tierEntries = Object.entries(tiers);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Knowledge Base</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Documentos de contexto para prompts
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
          Novo Documento
        </Button>
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 text-xs text-zinc-400 space-y-1">
        <p><span className="text-[#D4AF37] font-medium">Tier 1:</span> Carrega SEMPRE — DNA do projeto, regras globais</p>
        <p><span className="text-amber-400 font-medium">Tier 2:</span> Carrega por FASE — regras de roteiro, estilos específicos</p>
        <p><span className="text-blue-400 font-medium">Tier 3:</span> Carrega SOB DEMANDA — exemplos, schemas, referências</p>
      </div>

      {/* Tier tabs */}
      {tierEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tierEntries.map(([id, count]) => {
            const Icon = TIER_ICONS[id] || BookOpen;
            return (
              <button
                key={id}
                onClick={() => setSelectedTier(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTier === id
                    ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                    : "bg-[#111111] text-zinc-400 border border-white/5 hover:border-white/10 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {id === "all" ? "Todos" : id.replace("tier", "Tier ")}
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
      <div className="grid grid-cols-[280px_1fr] gap-4 h-[calc(100vh-340px)] min-h-[400px]">
        {/* List */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {isPending && items.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <BookOpen className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Nenhum documento</p>
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
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                    selected?.id === item.id
                      ? "bg-[#D4AF37]/5 border-l-2 border-[#D4AF37]"
                      : ""
                  } ${!item.is_active ? "opacity-50" : ""}`}
                >
                  <p className="text-sm font-medium text-white line-clamp-1">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {!item.is_active && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5 border-zinc-700 text-zinc-500"
                      >
                        INATIVO
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-4 px-1.5 ${TIER_COLORS[item.tier] || "border-white/10 text-zinc-500"}`}
                    >
                      {item.tier}
                    </Badge>
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
                      className={`text-[10px] ${TIER_COLORS[selected.tier] || "border-white/10 text-zinc-500"}`}
                    >
                      {selected.tier.replace("tier", "Tier ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{selected.key}</p>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Tier</Label>
                    <select
                      className="w-full p-2 rounded-md border text-sm bg-[#0A0A0A] border-white/10 text-white"
                      value={String(edited.tier || "tier1")}
                      onChange={(e) =>
                        setEdited({ ...edited, tier: e.target.value })
                      }
                    >
                      <option value="tier1">Tier 1 — Sempre carrega</option>
                      <option value="tier2">Tier 2 — Por fase</option>
                      <option value="tier3">Tier 3 — Sob demanda</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">
                      Recipe Slug (opcional)
                    </Label>
                    <Input
                      value={String(edited.recipe_slug || "")}
                      onChange={(e) =>
                        setEdited({ ...edited, recipe_slug: e.target.value })
                      }
                      placeholder="graciela-youtube-long"
                      className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Conteúdo</Label>
                  <Textarea
                    rows={16}
                    value={String(edited.content || "")}
                    onChange={(e) =>
                      setEdited({ ...edited, content: e.target.value })
                    }
                    className="bg-[#0A0A0A] border-white/10 text-white font-mono text-sm resize-none"
                  />
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
              <BookOpen className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Selecione um documento para editar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
