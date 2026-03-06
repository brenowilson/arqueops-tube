import { createServiceClient } from "@/lib/supabase/server";
import type { ExecutionContext, StepResult } from "../types";

/**
 * Transform executor: converts stage directions script to SSML.
 * This runs locally — no external API needed.
 */
export async function executeTransform(ctx: ExecutionContext): Promise<StepResult> {
  const start = Date.now();
  const script = ctx.previousOutputs.roteiro || "";

  if (!script) {
    return { output: "", duration_ms: Date.now() - start };
  }

  // Load SSML preset from DB
  const supabase = createServiceClient();
  const { data: preset } = await supabase
    .from("presets_ssml")
    .select("pause_mappings")
    .eq("key", "default-pauses")
    .single();

  const pauseMap: Record<string, string> = preset?.pause_mappings ?? {
    "[PAUSA CURTA]": "300ms",
    "[PAUSA]": "600ms",
    "[PAUSA LONGA]": "1200ms",
  };

  let ssml = script;

  // Replace pause markers with SSML break tags
  for (const [marker, duration] of Object.entries(pauseMap)) {
    ssml = ssml.replaceAll(marker, `<break time="${duration}"/>`);
  }

  // Convert voice markers to SSML voice tags
  ssml = ssml.replace(
    /\(voz:\s*(\w+)\)/gi,
    (_, voice) => `</voice><voice name="${voice.toUpperCase()}">`,
  );

  // Wrap in speak tags
  ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${ctx.language}">\n<voice name="NARRADOR">\n${ssml}\n</voice>\n</speak>`;

  // Clean up empty voice tags
  ssml = ssml.replace(/<\/voice><voice name="/g, '</voice>\n<voice name="');
  ssml = ssml.replace(/<voice name="NARRADOR">\s*<\/voice>/g, "");

  return {
    output: ssml,
    duration_ms: Date.now() - start,
  };
}
