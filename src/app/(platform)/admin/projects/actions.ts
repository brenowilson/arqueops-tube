"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function fetchChannels() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("youtube_channels")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createChannel(input: {
  name: string;
  handle?: string;
  url?: string;
  description?: string;
  language?: string;
  niche?: string;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("youtube_channels")
    .insert({
      name: input.name,
      handle: input.handle || null,
      url: input.url || null,
      description: input.description || null,
      language: input.language || "pt-BR",
      niche: input.niche || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
  return data;
}

export async function deleteChannel(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("youtube_channels")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
}

export async function toggleChannel(id: string, isActive: boolean) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("youtube_channels")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
}
