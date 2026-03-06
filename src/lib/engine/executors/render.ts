import type { ExecutionContext, StepResult } from "../types";

/**
 * FFmpeg render executor.
 * Currently a placeholder — will render video from audio + images + timeline.
 */
export async function executeRender(ctx: ExecutionContext): Promise<StepResult> {
  const start = Date.now();

  const hasAudio = !!ctx.previousOutputs.tts && !ctx.previousOutputs.tts.includes("[TTS SKIP]");
  const hasImages = !!ctx.previousOutputs.gerar_imagens && !ctx.previousOutputs.gerar_imagens.includes("[IMAGE SKIP]");

  if (!hasAudio && !hasImages) {
    return {
      output: "[RENDER PENDING] Áudio e imagens necessários para renderizar. Configure Azure TTS e provider de imagens.",
      duration_ms: Date.now() - start,
    };
  }

  return {
    output: `[RENDER PENDING] Assets disponíveis: audio=${hasAudio}, images=${hasImages}. FFmpeg rendering será implementado na próxima fase.`,
    duration_ms: Date.now() - start,
  };
}
