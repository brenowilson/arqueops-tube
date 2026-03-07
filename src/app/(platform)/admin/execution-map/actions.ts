"use server";

/**
 * Execution Map Actions - Governança de bindings
 *
 * DB Schema (execution_bindings):
 * - recipe_key (TEXT FK → recipes.key)
 * - step_key (TEXT)
 * - prompt_key (TEXT FK → prompts.key)
 * - provider_key (TEXT FK → providers.key)
 * - preset_key (TEXT — voice, video, or ssml preset key)
 * - kb_keys (JSONB — { "tier2": [...], "tier3": [...] })
 * - validator_keys (JSONB — string[])
 * - UNIQUE(recipe_key, step_key)
 */

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// QUERIES
// ============================================

export async function getProjects() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("youtube_channels")
    .select("*")
    .order("name", { ascending: true });
  return data || [];
}

export async function getRecipeSteps(recipeId: string) {
  const supabase = createServiceClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (!recipe) return [];

  const raw = recipe.steps || recipe.pipeline;
  const steps = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
  return steps.map(
    (step: { key: string; label?: string; name?: string }, index: number) => ({
      key: step.key,
      name: step.label || step.name || step.key,
      order: index,
    }),
  );
}

export async function getEffectiveConfig(
  recipeId: string,
  stepKey: string,
  _projectId?: string,
) {
  const supabase = createServiceClient();

  // Get recipe key from ID
  const { data: recipe } = await supabase
    .from("recipes")
    .select("key")
    .eq("id", recipeId)
    .single();

  if (!recipe) return {};

  // Load binding for this recipe + step
  const { data: binding } = await supabase
    .from("execution_bindings")
    .select("*")
    .eq("recipe_key", recipe.key)
    .eq("step_key", stepKey)
    .single();

  if (!binding) return {};

  const resolved: Record<string, unknown> = {};

  // Resolve prompt by key
  if (binding.prompt_key) {
    const { data: prompt } = await supabase
      .from("prompts")
      .select("id, name")
      .eq("key", binding.prompt_key)
      .single();
    if (prompt) resolved.prompt = { id: prompt.id, name: prompt.name, source: "global" };
  }

  // Resolve provider by key
  if (binding.provider_key) {
    const { data: provider } = await supabase
      .from("providers")
      .select("id, name")
      .eq("key", binding.provider_key)
      .single();
    if (provider) resolved.provider = { id: provider.id, name: provider.name, source: "global" };
  }

  // Resolve preset
  if (binding.preset_key) {
    const { data: voice } = await supabase
      .from("presets_voice")
      .select("id, name")
      .eq("key", binding.preset_key)
      .single();
    if (voice) {
      resolved.preset_voice = { id: voice.id, name: voice.name, source: "global" };
    } else {
      const { data: ssml } = await supabase
        .from("presets_ssml")
        .select("id, name")
        .eq("key", binding.preset_key)
        .single();
      if (ssml) {
        resolved.preset_ssml = { id: ssml.id, name: ssml.name, source: "global" };
      } else {
        const { data: video } = await supabase
          .from("presets_video")
          .select("id, name")
          .eq("key", binding.preset_key)
          .single();
        if (video) resolved.preset_video = { id: video.id, name: video.name, source: "global" };
      }
    }
  }

  // Resolve validators
  const validatorKeys: string[] = Array.isArray(binding.validator_keys) ? binding.validator_keys : [];
  if (validatorKeys.length > 0) {
    const items = [];
    for (const key of validatorKeys) {
      const { data: v } = await supabase.from("validators").select("id, name").eq("key", key).single();
      if (v) items.push({ id: v.id, name: v.name });
    }
    if (items.length) resolved.validators = { items, source: "global" };
  }

  // Resolve KB
  const kbKeys = binding.kb_keys || {};
  const allKbKeys: string[] = [
    ...(Array.isArray(kbKeys.tier2) ? kbKeys.tier2 : []),
    ...(Array.isArray(kbKeys.tier3) ? kbKeys.tier3 : []),
  ];
  if (allKbKeys.length > 0) {
    const items = [];
    for (const key of allKbKeys) {
      const { data: kb } = await supabase.from("knowledge_base").select("id, title").eq("key", key).single();
      if (kb) items.push({ id: kb.id, name: kb.title });
    }
    if (items.length) resolved.kb = { items, source: "global" };
  }

  return resolved;
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Set a binding slot for a recipe step.
 * Uses UPSERT since (recipe_key, step_key) is UNIQUE.
 */
export async function setBinding(
  recipeId: string,
  stepKey: string,
  slot: string,
  targetId: string,
  _scope: "global" | "project" = "global",
  _projectId?: string,
) {
  const supabase = createServiceClient();

  // Get recipe key from ID
  const { data: recipe } = await supabase
    .from("recipes")
    .select("key")
    .eq("id", recipeId)
    .single();

  if (!recipe) throw new Error("Recipe não encontrada");

  // Resolve target key based on slot type
  let targetKey: string | null = null;
  const lookupTable: Record<string, string> = {
    prompt: "prompts",
    provider: "providers",
    preset_voice: "presets_voice",
    preset_ssml: "presets_ssml",
    preset_video: "presets_video",
    preset_effects: "presets_voice", // fallback
  };

  if (lookupTable[slot]) {
    const { data: target } = await supabase
      .from(lookupTable[slot])
      .select("key")
      .eq("id", targetId)
      .single();
    targetKey = target?.key || null;
  }

  // Load existing binding
  const { data: existing } = await supabase
    .from("execution_bindings")
    .select("*")
    .eq("recipe_key", recipe.key)
    .eq("step_key", stepKey)
    .single();

  const updates: Record<string, unknown> = {};

  if (slot === "prompt") updates.prompt_key = targetKey;
  else if (slot === "provider") updates.provider_key = targetKey;
  else if (["preset_voice", "preset_ssml", "preset_video", "preset_effects"].includes(slot)) updates.preset_key = targetKey;
  else if (slot === "validators") {
    const { data: v } = await supabase.from("validators").select("key").eq("id", targetId).single();
    if (v) {
      const currentKeys: string[] = Array.isArray(existing?.validator_keys) ? existing.validator_keys : [];
      if (!currentKeys.includes(v.key)) {
        updates.validator_keys = [...currentKeys, v.key];
      }
    }
  } else if (slot === "kb") {
    const { data: kb } = await supabase.from("knowledge_base").select("key, tier").eq("id", targetId).single();
    if (kb) {
      const currentKb = existing?.kb_keys || {};
      const tierKey = `tier${kb.tier}`;
      const currentTierKeys: string[] = Array.isArray(currentKb[tierKey]) ? currentKb[tierKey] : [];
      if (!currentTierKeys.includes(kb.key)) {
        updates.kb_keys = { ...currentKb, [tierKey]: [...currentTierKeys, kb.key] };
      }
    }
  }

  if (existing) {
    await supabase
      .from("execution_bindings")
      .update(updates)
      .eq("recipe_key", recipe.key)
      .eq("step_key", stepKey);
  } else {
    await supabase.from("execution_bindings").insert({
      recipe_key: recipe.key,
      step_key: stepKey,
      prompt_key: null,
      provider_key: null,
      preset_key: null,
      kb_keys: {},
      validator_keys: [],
      ...updates,
    });
  }

  revalidatePath("/admin/execution-map");
  return { success: true };
}

export async function resetToGlobal(
  recipeId: string,
  stepKey: string,
  slot: string,
  _projectId: string,
) {
  const supabase = createServiceClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("key")
    .eq("id", recipeId)
    .single();

  if (!recipe) throw new Error("Recipe não encontrada");

  const updates: Record<string, unknown> = {};
  if (slot === "prompt") updates.prompt_key = null;
  else if (slot === "provider") updates.provider_key = null;
  else if (["preset_voice", "preset_ssml", "preset_video"].includes(slot)) updates.preset_key = null;
  else if (slot === "validators") updates.validator_keys = [];
  else if (slot === "kb") updates.kb_keys = {};

  await supabase
    .from("execution_bindings")
    .update(updates)
    .eq("recipe_key", recipe.key)
    .eq("step_key", stepKey);

  revalidatePath("/admin/execution-map");
  return { success: true };
}

export async function seedDefaultBindings(recipeId: string) {
  const supabase = createServiceClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("key, steps")
    .eq("id", recipeId)
    .single();

  if (!recipe) throw new Error("Recipe não encontrada");

  const steps = Array.isArray(recipe.steps) ? recipe.steps : JSON.parse(recipe.steps || "[]");

  // Get first available of each type
  const [
    { data: prompts },
    { data: providers },
    { data: voices },
    { data: ssmls },
    { data: validators },
    { data: kbs },
  ] = await Promise.all([
    supabase.from("prompts").select("key").limit(1),
    supabase.from("providers").select("key").limit(1),
    supabase.from("presets_voice").select("key").limit(1),
    supabase.from("presets_ssml").select("key").limit(1),
    supabase.from("validators").select("key").limit(1),
    supabase.from("knowledge_base").select("key, tier").limit(1),
  ]);

  const promptKey = prompts?.[0]?.key || null;
  const providerKey = providers?.[0]?.key || null;
  const voiceKey = voices?.[0]?.key || null;
  const ssmlKey = ssmls?.[0]?.key || null;
  const validatorKey = validators?.[0]?.key || null;
  const kb = kbs?.[0] || null;

  for (const step of steps) {
    const binding: Record<string, unknown> = {
      recipe_key: recipe.key,
      step_key: step.key,
      prompt_key: null,
      provider_key: providerKey,
      preset_key: null,
      kb_keys: {},
      validator_keys: [],
    };

    // LLM steps get prompt + validator + KB
    if (["ideacao", "titulo", "brief", "planejamento", "roteiro", "prompts_cenas", "miniaturas"].includes(step.key)) {
      binding.prompt_key = promptKey;
      if (validatorKey) binding.validator_keys = [validatorKey];
      if (kb) binding.kb_keys = { [`tier${kb.tier}`]: [kb.key] };
    }

    // TTS/SSML steps get presets
    if (step.key === "tts" || step.key === "parse_ssml") {
      binding.preset_key = step.key === "tts" ? voiceKey : ssmlKey;
    }

    // Upsert (ignore conflicts on unique recipe_key+step_key)
    const { error } = await supabase
      .from("execution_bindings")
      .upsert(binding, { onConflict: "recipe_key,step_key" });

    if (error) console.error(`Seed binding error for ${step.key}:`, error.message);
  }

  revalidatePath("/admin/execution-map");
  return { success: true };
}
