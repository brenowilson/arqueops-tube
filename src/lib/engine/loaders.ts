/**
 * Database Loaders - Supabase adapted
 * Ported from Video Factory OS (replaced Drizzle with Supabase)
 */

import { createServiceClient } from "@/lib/supabase/server";

export interface PromptConfig {
    id: string;
    name: string;
    version: number;
    systemPrompt: string;
    userTemplate: string;
    model: string;
    maxTokens: number;
    temperature: number;
}

export interface ProviderConfig {
    id: string;
    slug: string;
    name: string;
    type: string;
    baseUrl?: string;
    defaultModel?: string;
    config: Record<string, unknown>;
}

export interface ValidatorConfig {
    id: string;
    name: string;
    type: string;
    config: Record<string, unknown>;
    errorMessage: string;
}

export async function loadPrompt(promptId: string): Promise<PromptConfig | null> {
    const supabase = createServiceClient();
    const { data: prompt } = await supabase
        .from("prompts")
        .select("*")
        .eq("id", promptId)
        .single();

    if (!prompt) return null;

    return {
        id: prompt.id,
        name: prompt.name,
        version: prompt.version ?? 1,
        systemPrompt: prompt.system_template || "",
        userTemplate: prompt.user_template || "",
        model: prompt.model || "claude-sonnet-4-6",
        maxTokens: prompt.max_tokens || 4096,
        temperature: prompt.temperature ?? 0.7,
    };
}

export async function loadProvider(providerId: string): Promise<ProviderConfig | null> {
    const supabase = createServiceClient();
    const { data: provider } = await supabase
        .from("providers")
        .select("*")
        .eq("id", providerId)
        .single();

    if (!provider) return null;

    const config = typeof provider.config === "string" ? JSON.parse(provider.config) : (provider.config || {});
    return {
        id: provider.id,
        slug: provider.key,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.base_url || undefined,
        defaultModel: config.default_model || undefined,
        config,
    };
}

export async function loadVoicePreset(presetId: string) {
    const supabase = createServiceClient();
    const { data: preset } = await supabase
        .from("presets_voice")
        .select("*")
        .eq("id", presetId)
        .single();

    return preset;
}

export async function loadSsmlPreset(presetId: string) {
    const supabase = createServiceClient();
    const { data: preset } = await supabase
        .from("presets_ssml")
        .select("*")
        .eq("id", presetId)
        .single();

    return preset;
}

export async function loadVideoPreset(presetId: string) {
    const supabase = createServiceClient();
    const { data: preset } = await supabase
        .from("presets_video")
        .select("*")
        .eq("id", presetId)
        .single();

    if (!preset) return null;

    return {
        encoder: preset.encoder,
        scale: preset.scale,
        fps: preset.fps,
        bitrate: preset.bitrate,
        pixelFormat: preset.pixel_format,
        audioCodec: preset.audio_codec,
        audioBitrate: preset.audio_bitrate,
    };
}

export async function loadValidators(validatorIds: string[]): Promise<ValidatorConfig[]> {
    if (validatorIds.length === 0) return [];
    const supabase = createServiceClient();
    const { data: validators } = await supabase
        .from("validators")
        .select("*")
        .in("id", validatorIds);

    if (!validators) return [];

    return validators.map((v) => ({
        id: v.id,
        name: v.name,
        type: v.type,
        config: typeof v.config === "string" ? JSON.parse(v.config) : (v.config || {}),
        errorMessage: v.error_message,
    }));
}

export async function loadKnowledgeBase(kbIds: string[]): Promise<string> {
    if (kbIds.length === 0) return "";
    const supabase = createServiceClient();
    const { data: kbs } = await supabase
        .from("knowledge_base")
        .select("*")
        .in("id", kbIds);

    if (!kbs) return "";

    return kbs.map((kb) => `[${kb.title}]\n${kb.content}`).join("\n\n---\n\n");
}
