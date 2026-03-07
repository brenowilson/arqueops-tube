"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings2,
  RefreshCw,
  Check,
  Loader2,
  FileText,
  Server,
  Mic,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  Video,
  Sparkles,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import {
  getProjects,
  getRecipeSteps,
  getEffectiveConfig,
  setBinding,
  resetToGlobal,
  seedDefaultBindings,
} from "./actions";
import {
  getRecipes,
  getPrompts,
  getProviders,
  getValidators,
  getKnowledgeBase,
  getVoicePresets,
  getSsmlPresets,
} from "../actions";
import {
  getStepKind,
  getAllowedSlots,
  KIND_LABELS,
  type SlotType,
} from "@/lib/engine/capabilities";

type Project = Awaited<ReturnType<typeof getProjects>>[0];
type Recipe = Awaited<ReturnType<typeof getRecipes>>[0];

interface StepSlot {
  slot: SlotType;
  label: string;
  icon: React.ElementType;
  type: "single" | "multi";
}

const ALL_SLOTS: StepSlot[] = [
  { slot: "prompt", label: "Prompt", icon: FileText, type: "single" },
  { slot: "provider", label: "Provider", icon: Server, type: "single" },
  { slot: "preset_voice", label: "Voice Preset", icon: Mic, type: "single" },
  { slot: "preset_ssml", label: "SSML Preset", icon: FileText, type: "single" },
  { slot: "preset_video", label: "Video Preset", icon: Video, type: "single" },
  { slot: "preset_effects", label: "Effects Preset", icon: Sparkles, type: "single" },
  { slot: "validators", label: "Validators", icon: ShieldCheck, type: "multi" },
  { slot: "kb", label: "Knowledge Base", icon: BookOpen, type: "multi" },
];

export default function ExecutionMapPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("global");
  const [steps, setSteps] = useState<
    Array<{ key: string; name: string; order: number }>
  >([]);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [stepConfig, setStepConfig] = useState<Record<string, unknown>>({});
  const [isPending, startTransition] = useTransition();

  const [promptsList, setPromptsList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [providersList, setProvidersList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [validatorsList, setValidatorsList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [kbList, setKbList] = useState<Array<{ id: string; name: string }>>([]);
  const [voicePresetsList, setVoicePresetsList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [ssmlPresetsList, setSsmlPresetsList] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Load initial data
  useEffect(() => {
    startTransition(async () => {
      const [
        projectsData,
        recipesData,
        prompts,
        providers,
        validators,
        kb,
        voicePresets,
        ssmlPresets,
      ] = await Promise.all([
        getProjects(),
        getRecipes(),
        getPrompts(),
        getProviders(),
        getValidators(),
        getKnowledgeBase(),
        getVoicePresets(),
        getSsmlPresets(),
      ]);
      setProjects(projectsData);
      setRecipes(recipesData);
      setPromptsList(prompts.map((p) => ({ id: p.id, name: p.name })));
      setProvidersList(providers.map((p) => ({ id: p.id, name: p.name })));
      setValidatorsList(validators.map((v) => ({ id: v.id, name: v.name })));
      setKbList(kb.map((k) => ({ id: k.id, name: k.name })));
      setVoicePresetsList(voicePresets.map((v) => ({ id: v.id, name: v.name })));
      setSsmlPresetsList(ssmlPresets.map((s) => ({ id: s.id, name: s.name })));

      if (recipesData.length > 0) {
        setSelectedRecipeId(recipesData[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load steps when recipe changes
  useEffect(() => {
    if (!selectedRecipeId) return;
    startTransition(async () => {
      const stepsData = await getRecipeSteps(selectedRecipeId);
      setSteps(stepsData);
      if (stepsData.length > 0) {
        setSelectedStep(stepsData[0].key);
      }
    });
  }, [selectedRecipeId]);

  // Load step config when step or project changes
  useEffect(() => {
    if (!selectedRecipeId || !selectedStep) return;
    startTransition(async () => {
      const config = await getEffectiveConfig(
        selectedRecipeId,
        selectedStep,
        selectedProjectId === "global" ? undefined : selectedProjectId,
      );
      setStepConfig(config);
    });
  }, [selectedRecipeId, selectedStep, selectedProjectId]);

  async function handleSetBinding(slot: string, targetId: string) {
    if (!selectedRecipeId || !selectedStep) return;
    startTransition(async () => {
      await setBinding(
        selectedRecipeId,
        selectedStep,
        slot,
        targetId,
        selectedProjectId === "global" ? "global" : "project",
        selectedProjectId === "global" ? undefined : selectedProjectId,
      );
      const config = await getEffectiveConfig(
        selectedRecipeId,
        selectedStep,
        selectedProjectId === "global" ? undefined : selectedProjectId,
      );
      setStepConfig(config);
    });
  }

  async function handleResetToGlobal(slot: string) {
    if (!selectedRecipeId || !selectedStep || selectedProjectId === "global")
      return;
    startTransition(async () => {
      await resetToGlobal(
        selectedRecipeId,
        selectedStep,
        slot,
        selectedProjectId,
      );
      const config = await getEffectiveConfig(
        selectedRecipeId,
        selectedStep,
        selectedProjectId,
      );
      setStepConfig(config);
    });
  }

  async function handleSeedBindings() {
    if (!selectedRecipeId) return;
    startTransition(async () => {
      await seedDefaultBindings(selectedRecipeId);
      if (selectedStep) {
        const config = await getEffectiveConfig(
          selectedRecipeId,
          selectedStep,
          selectedProjectId === "global" ? undefined : selectedProjectId,
        );
        setStepConfig(config);
      }
    });
  }

  const getSlotValue = (slot: string) => {
    return (stepConfig[slot] as Record<string, unknown>) || {};
  };

  const getOptionsForSlot = (slot: string) => {
    switch (slot) {
      case "prompt": return promptsList;
      case "provider": return providersList;
      case "validators": return validatorsList;
      case "kb": return kbList;
      case "preset_voice": return voicePresetsList;
      case "preset_ssml": return ssmlPresetsList;
      default: return [];
    }
  };

  const stepKind = selectedStep ? getStepKind(selectedStep) : null;
  const allowedSlots = selectedStep ? getAllowedSlots(selectedStep) : [];
  const filteredSlots = ALL_SLOTS.filter((s) => allowedSlots.includes(s.slot));

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Execution Map</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Governança de wiring: prompt, provider e preset por step
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedBindings}
          disabled={isPending}
          className="gap-2 border-white/10 text-zinc-400 hover:text-white"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Settings2 className="w-4 h-4" />
          )}
          Seed Bindings
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Recipe</Label>
          <Select
            value={selectedRecipeId || ""}
            onValueChange={setSelectedRecipeId}
          >
            <SelectTrigger className="w-[250px] bg-[#111111] border-white/10 text-white">
              <SelectValue placeholder="Selecionar recipe..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              {recipes.map((r) => (
                <SelectItem
                  key={r.id}
                  value={r.id}
                  className="text-zinc-200 focus:bg-white/10"
                >
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Scope</Label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="w-[200px] bg-[#111111] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              <SelectItem
                value="global"
                className="text-zinc-200 focus:bg-white/10"
              >
                Global (padrão)
              </SelectItem>
              {projects.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="text-zinc-200 focus:bg-white/10"
                >
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-[220px_1fr] gap-4 h-[calc(100vh-300px)] min-h-[400px]">
        {/* Steps list */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {isPending && steps.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
              <MapPin className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">Nenhum step na recipe</p>
              <p className="text-xs text-zinc-600">
                Selecione uma recipe com pipeline definido
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {steps.map((step, index) => {
                const kind = getStepKind(step.key);
                return (
                  <button
                    key={step.key}
                    onClick={() => setSelectedStep(step.key)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                      selectedStep === step.key
                        ? "bg-[#D4AF37]/5 border-l-2 border-[#D4AF37]"
                        : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{step.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-600">
                        Step {index + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5 border-white/10 text-zinc-500"
                      >
                        {KIND_LABELS[kind]}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Config detail */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-y-auto">
          {selectedStep ? (
            <div className="p-5">
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-white">
                    {steps.find((s) => s.key === selectedStep)?.name}
                  </h2>
                  {stepKind && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-white/10 text-zinc-500"
                    >
                      {KIND_LABELS[stepKind]}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  Step: {selectedStep} • Scope:{" "}
                  {selectedProjectId === "global"
                    ? "Global"
                    : projects.find((p) => p.id === selectedProjectId)?.name}
                </p>
              </div>

              {filteredSlots.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  Nenhum slot disponível para este tipo de step.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSlots.map((slotDef) => {
                    const value = getSlotValue(slotDef.slot);
                    const Icon = slotDef.icon;
                    const options = getOptionsForSlot(slotDef.slot);
                    const source = value.source as string | undefined;
                    const itemId = value.id as string | undefined;
                    const items = value.items as
                      | Array<{ id: string; name: string }>
                      | undefined;

                    return (
                      <div
                        key={slotDef.slot}
                        className="rounded-lg border border-white/5 bg-[#0A0A0A] p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-zinc-500" />
                            <span className="text-sm font-medium text-zinc-200">
                              {slotDef.label}
                            </span>
                            {source && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-4 px-1.5 ${
                                  source === "project"
                                    ? "border-[#D4AF37]/30 text-[#D4AF37]"
                                    : "border-white/10 text-zinc-500"
                                }`}
                              >
                                {source}
                              </Badge>
                            )}
                          </div>
                          {source === "project" &&
                            selectedProjectId !== "global" && (
                              <button
                                onClick={() =>
                                  handleResetToGlobal(slotDef.slot)
                                }
                                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Reset to Global
                              </button>
                            )}
                        </div>

                        {slotDef.type === "single" ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={itemId || ""}
                              onValueChange={(id) =>
                                handleSetBinding(slotDef.slot, id)
                              }
                            >
                              <SelectTrigger className="flex-1 bg-[#111111] border-white/10 text-white text-sm">
                                <SelectValue
                                  placeholder={`Selecionar ${slotDef.label.toLowerCase()}...`}
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1A1A1A] border-white/10">
                                {options.map((o) => (
                                  <SelectItem
                                    key={o.id}
                                    value={o.id}
                                    className="text-zinc-200 focus:bg-white/10"
                                  >
                                    {o.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {itemId && (
                              <Link
                                href={`/admin/${
                                  slotDef.slot === "prompt"
                                    ? "prompts"
                                    : slotDef.slot === "provider"
                                      ? "providers"
                                      : "presets"
                                }?id=${itemId}`}
                              >
                                <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {items && items.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {items.map((item) => (
                                  <Badge
                                    key={item.id}
                                    variant="outline"
                                    className="gap-1 border-white/10 text-zinc-300 text-xs"
                                  >
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    {item.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-600">
                                Nenhum {slotDef.label.toLowerCase()} configurado
                              </p>
                            )}
                            <Select
                              onValueChange={(id) =>
                                handleSetBinding(slotDef.slot, id)
                              }
                            >
                              <SelectTrigger className="bg-[#111111] border-white/10 text-white text-sm">
                                <SelectValue
                                  placeholder={`Adicionar ${slotDef.label.toLowerCase()}...`}
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1A1A1A] border-white/10">
                                {options.map((o) => (
                                  <SelectItem
                                    key={o.id}
                                    value={o.id}
                                    className="text-zinc-200 focus:bg-white/10"
                                  >
                                    {o.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-6">
              <MapPin className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Selecione um step para configurar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
