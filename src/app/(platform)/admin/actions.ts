"use server";

/**
 * Admin Actions - Server Actions para CRUD do Admin
 *
 * Config-First: todas as listas vêm do DB, zero hardcode.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// PROMPTS
// ============================================

export async function getPrompts(search?: string, category?: string) {
  const supabase = createServiceClient();
  const { data: results } = await supabase
    .from("prompts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!results) return [];

  return results.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !category || category === "all" || p.category === category;
    return matchesSearch && matchesCategory;
  });
}

export async function getPromptCategories() {
  const supabase = createServiceClient();
  const { data: prompts } = await supabase.from("prompts").select("*");

  if (!prompts) return { all: 0 };

  const categories = prompts.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    all: prompts.length,
    ...categories,
  };
}

export async function updatePrompt(id: string, data: Record<string, unknown>) {
  const supabase = createServiceClient();

  await supabase
    .from("prompts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/prompts");
}

export async function createPrompt(data: Record<string, unknown>) {
  const supabase = createServiceClient();
  const newPrompt = {
    key: `prompt-${Date.now()}`,
    name: "Novo Prompt",
    category: "script",
    system_template: "",
    user_template: "",
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.7,
    version: 1,
    is_active: true,
    ...data,
  };
  const { data: created, error } = await supabase
    .from("prompts")
    .insert(newPrompt)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/prompts");
  return created;
}

// ============================================
// PROVIDERS
// ============================================

export async function getProviders(search?: string, type?: string) {
  const supabase = createServiceClient();
  const { data: results } = await supabase
    .from("providers")
    .select("*")
    .order("name", { ascending: true });

  if (!results) return [];

  return results.filter((p) => {
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !type || type === "all" || p.type === type;
    return matchesSearch && matchesType;
  });
}

export async function getProviderTypes() {
  const supabase = createServiceClient();
  const { data: providers } = await supabase.from("providers").select("*");

  if (!providers) return { all: 0 };

  const types = providers.reduce(
    (acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return { all: providers.length, ...types };
}

export async function updateProvider(
  id: string,
  data: Record<string, unknown>,
) {
  const supabase = createServiceClient();
  // Only send columns that actually exist in the providers table
  const allowed = ["name", "type", "base_url", "config", "is_active"];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data) {
      // config must be a JSON object, not a string
      if (key === "config" && typeof data[key] === "string") {
        try { clean[key] = JSON.parse(data[key] as string); } catch { clean[key] = {}; }
      } else {
        clean[key] = data[key];
      }
    }
  }
  // Store default_model inside config JSONB (not a top-level column)
  if ("default_model" in data) {
    const cfg = (typeof clean.config === "object" && clean.config) ? clean.config as Record<string, unknown> : {};
    cfg.default_model = data.default_model;
    clean.config = cfg;
  }
  const { error } = await supabase.from("providers").update(clean).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/providers");
}

export async function createProvider() {
  const supabase = createServiceClient();
  const newProvider = {
    key: `provider-${Date.now()}`,
    name: "Novo Provider",
    type: "llm",
    config: {},
    is_active: true,
  };
  const { data: created, error } = await supabase
    .from("providers")
    .insert(newProvider)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/providers");
  return created;
}

// ============================================
// VALIDATORS
// ============================================

export async function getValidators(search?: string, type?: string) {
  const supabase = createServiceClient();
  const { data: results } = await supabase
    .from("validators")
    .select("*")
    .order("name", { ascending: true });

  if (!results) return [];

  return results.filter((v) => {
    const matchesSearch =
      !search || v.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !type || type === "all" || v.type === type;
    return matchesSearch && matchesType;
  });
}

export async function getValidatorTypes() {
  const supabase = createServiceClient();
  const { data: validators } = await supabase.from("validators").select("*");

  if (!validators) return { all: 0 };

  const types = validators.reduce(
    (acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return { all: validators.length, ...types };
}

export async function updateValidator(
  id: string,
  data: Record<string, unknown>,
) {
  const supabase = createServiceClient();
  await supabase.from("validators").update(data).eq("id", id);
  revalidatePath("/admin/validators");
}

export async function createValidator() {
  const supabase = createServiceClient();
  const newValidator = {
    key: `validator-${Date.now()}`,
    name: "Novo Validator",
    type: "forbidden_patterns",
    config: { pattern: "", error_message: "Validação falhou" },
    is_active: true,
  };
  const { data: created, error } = await supabase
    .from("validators")
    .insert(newValidator)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/validators");
  return created;
}

// ============================================
// RECIPES
// ============================================

export async function getRecipes(search?: string) {
  const supabase = createServiceClient();
  const { data: results } = await supabase
    .from("recipes")
    .select("*")
    .order("name", { ascending: true });

  if (!results) return [];

  return results.filter((r) => {
    return (
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.key.toLowerCase().includes(search.toLowerCase())
    );
  });
}

export async function updateRecipe(id: string, data: Record<string, unknown>) {
  const supabase = createServiceClient();
  await supabase
    .from("recipes")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/recipes");
}

export async function createRecipe() {
  const supabase = createServiceClient();
  const newRecipe = {
    key: `recipe-${Date.now()}`,
    name: "Nova Recipe",
    steps: [],
    version: 1,
    is_active: true,
  };
  const { data: created, error } = await supabase
    .from("recipes")
    .insert(newRecipe)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/recipes");
  return created;
}

// ============================================
// KNOWLEDGE BASE
// ============================================

export async function getKnowledgeBase(search?: string, tier?: string) {
  const supabase = createServiceClient();
  const { data: results } = await supabase
    .from("knowledge_base")
    .select("*")
    .order("name", { ascending: true });

  if (!results) return [];

  return results.filter((kb) => {
    const matchesSearch =
      !search || kb.name.toLowerCase().includes(search.toLowerCase());
    const matchesTier = !tier || tier === "all" || kb.tier === tier;
    return matchesSearch && matchesTier;
  });
}

export async function getKnowledgeTiers() {
  const supabase = createServiceClient();
  const { data: items } = await supabase.from("knowledge_base").select("*");

  if (!items) return { all: 0 };

  const tiers = items.reduce(
    (acc, kb) => {
      acc[kb.tier] = (acc[kb.tier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return { all: items.length, ...tiers };
}

export async function updateKnowledge(
  id: string,
  data: Record<string, unknown>,
) {
  const supabase = createServiceClient();
  await supabase
    .from("knowledge_base")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/knowledge-base");
}

export async function createKnowledge() {
  const supabase = createServiceClient();
  const newKb = {
    key: `kb-${Date.now()}`,
    title: "Novo Documento",
    tier: 1,
    category: "general",
    content: "",
    is_active: true,
  };
  const { data: created, error } = await supabase
    .from("knowledge_base")
    .insert(newKb)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/knowledge-base");
  return created;
}

// ============================================
// PRESETS (Voice, Video, Effects, SSML)
// ============================================

export type PresetType = "voice" | "video" | "effects" | "ssml";

export async function getPresets(type?: PresetType, search?: string) {
  const supabase = createServiceClient();

  const [
    { data: voice },
    { data: video },
    { data: effects },
    { data: ssml },
  ] = await Promise.all([
    supabase.from("presets_voice").select("*"),
    supabase.from("presets_video").select("*"),
    supabase.from("presets_effects").select("*"),
    supabase.from("presets_ssml").select("*"),
  ]);

  const all = [
    ...(voice || []).map((v) => ({ ...v, preset_type: "voice" as const })),
    ...(video || []).map((v) => ({ ...v, preset_type: "video" as const })),
    ...(effects || []).map((v) => ({ ...v, preset_type: "effects" as const })),
    ...(ssml || []).map((v) => ({ ...v, preset_type: "ssml" as const })),
  ];

  return all.filter((p) => {
    const matchesType =
      !type || (type as string) === "all" || p.preset_type === type;
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });
}

export async function getPresetCounts() {
  const supabase = createServiceClient();

  const [
    { data: voice },
    { data: video },
    { data: effects },
    { data: ssml },
  ] = await Promise.all([
    supabase.from("presets_voice").select("id"),
    supabase.from("presets_video").select("id"),
    supabase.from("presets_effects").select("id"),
    supabase.from("presets_ssml").select("id"),
  ]);

  return {
    all:
      (voice?.length ?? 0) +
      (video?.length ?? 0) +
      (effects?.length ?? 0) +
      (ssml?.length ?? 0),
    voice: voice?.length ?? 0,
    video: video?.length ?? 0,
    effects: effects?.length ?? 0,
    ssml: ssml?.length ?? 0,
  };
}

export async function getVoicePresets() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("presets_voice").select("*");
  return data || [];
}

export async function getSsmlPresets() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("presets_ssml").select("*");
  return data || [];
}

export async function getVideoPresets() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("presets_video").select("*");
  return data || [];
}

export async function updatePreset(
  type: PresetType,
  id: string,
  data: Record<string, unknown>,
) {
  const supabase = createServiceClient();

  const cleanData = Object.fromEntries(
    Object.entries(data).filter(
      ([k]) => !["id", "created_at", "preset_type"].includes(k),
    ),
  );

  const tableMap: Record<PresetType, string> = {
    voice: "presets_voice",
    video: "presets_video",
    effects: "presets_effects",
    ssml: "presets_ssml",
  };

  await supabase.from(tableMap[type]).update(cleanData).eq("id", id);
  revalidatePath("/admin/presets");
}

// ============================================
// PROJECTS
// ============================================

export async function getProjects(search?: string) {
  const supabase = createServiceClient();
  const { data: results } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (!results) return [];

  return results.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.key && p.key.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });
}
