import type { ExecutionContext, StepResult } from "../types";

/**
 * TTS executor: Azure Speech Services Batch Synthesis.
 * Requires AZURE_SPEECH_KEY and AZURE_SPEECH_REGION env vars.
 */
export async function executeTTS(ctx: ExecutionContext): Promise<StepResult> {
  const start = Date.now();
  const ssml = ctx.previousOutputs.parse_ssml || "";

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || "eastus";

  if (!key) {
    return {
      output: "[TTS SKIP] AZURE_SPEECH_KEY não configurada. Configure para gerar narração.",
      duration_ms: Date.now() - start,
    };
  }

  if (!ssml) {
    return {
      output: "[TTS SKIP] Nenhum SSML disponível para narrar.",
      duration_ms: Date.now() - start,
    };
  }

  // Create batch synthesis job
  const synthesisId = `tube-${ctx.jobId.slice(0, 8)}-${Date.now()}`;
  const endpoint = `https://${region}.api.cognitive.microsoft.com/texttospeech/batchsyntheses/${synthesisId}?api-version=2024-04-01`;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputKind: "SSML",
      inputs: [{ content: ssml }],
      properties: {
        outputFormat: "audio-48khz-192kbitrate-mono-mp3",
        destinationContainerUrl: undefined,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return {
      output: `[TTS ERROR] Azure retornou ${response.status}: ${err}`,
      duration_ms: Date.now() - start,
    };
  }

  // Poll for completion (max 30 min, every 30s)
  const statusUrl = `https://${region}.api.cognitive.microsoft.com/texttospeech/batchsyntheses/${synthesisId}?api-version=2024-04-01`;
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 30_000));
    attempts++;

    const statusRes = await fetch(statusUrl, {
      headers: { "Ocp-Apim-Subscription-Key": key },
    });
    const status = await statusRes.json();

    if (status.status === "Succeeded") {
      const outputUrl = status.outputs?.result;
      return {
        output: outputUrl || "[TTS OK] Narração gerada com sucesso.",
        artifacts: outputUrl ? [{ path: outputUrl, mime_type: "audio/mp3" }] : undefined,
        duration_ms: Date.now() - start,
      };
    }

    if (status.status === "Failed") {
      return {
        output: `[TTS FAILED] ${status.properties?.error?.message || "Erro desconhecido"}`,
        duration_ms: Date.now() - start,
      };
    }
  }

  return {
    output: "[TTS TIMEOUT] Timeout após 30 minutos de polling.",
    duration_ms: Date.now() - start,
  };
}
