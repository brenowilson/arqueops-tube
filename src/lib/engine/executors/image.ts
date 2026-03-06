import type { ExecutionContext, StepResult } from "../types";

/**
 * Image generation executor.
 * Currently a placeholder — will integrate with image generation APIs.
 */
export async function executeImage(ctx: ExecutionContext): Promise<StepResult> {
  const start = Date.now();
  const scenePrompts = ctx.previousOutputs.prompts_cenas || "";

  if (!scenePrompts) {
    return {
      output: "[IMAGE SKIP] Nenhum prompt de cena disponível.",
      duration_ms: Date.now() - start,
    };
  }

  // Parse scene prompts
  let scenes: Array<{ scene: number; prompt: string; style: string; mood: string }> = [];
  try {
    const jsonMatch = scenePrompts.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      scenes = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // If not valid JSON, treat as text
  }

  const output = scenes.length > 0
    ? `[IMAGE] ${scenes.length} prompts de cena prontos para geração.\n\n${scenes.map((s) => `Cena ${s.scene}: ${s.prompt}`).join("\n")}`
    : `[IMAGE PENDING] Prompts de cena gerados. Configure um provider de imagens para gerar.`;

  return {
    output,
    duration_ms: Date.now() - start,
  };
}
