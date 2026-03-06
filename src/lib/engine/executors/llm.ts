import { spawn } from "child_process";
import { createServiceClient } from "@/lib/supabase/server";
import type { ExecutionContext, StepResult } from "../types";

const CLAUDE_CLI = process.env.CLAUDE_CLI_PATH ?? "claude";

async function callClaude(systemPrompt: string, userPrompt: string): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const fullPrompt = `<system>\n${systemPrompt}\n</system>\n\n${userPrompt}`;

  return new Promise((resolve, reject) => {
    const args = [
      "-p", fullPrompt,
      "--output-format", "json",
      "--max-turns", "1",
      "--model", "claude-sonnet-4-6",
    ];

    const env = { ...process.env };
    delete env.CLAUDECODE;
    env.CLAUDECODE = "";

    const proc = spawn(CLAUDE_CLI, args, {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    proc.stdin.end();

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Claude CLI timeout (5 min)"));
    }, 300_000);

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const text = parsed.result ?? parsed.content ?? stdout;
        resolve({
          text: typeof text === "string" ? text : JSON.stringify(text),
          usage: {
            input_tokens: parsed.usage?.input_tokens ?? 0,
            output_tokens: parsed.usage?.output_tokens ?? 0,
          },
        });
      } catch {
        // If not JSON, use raw stdout
        resolve({ text: stdout.trim(), usage: { input_tokens: 0, output_tokens: 0 } });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}

export async function executeLLM(ctx: ExecutionContext): Promise<StepResult> {
  const supabase = createServiceClient();
  const start = Date.now();

  // Load prompt from DB
  const { data: binding } = await supabase
    .from("execution_bindings")
    .select("prompt_key, kb_keys")
    .eq("step_key", ctx.stepKey)
    .limit(1)
    .single();

  let systemPrompt = "";
  let userPrompt = "";

  if (binding?.prompt_key) {
    const { data: prompt } = await supabase
      .from("prompts")
      .select("system_template, user_template, model, max_tokens, temperature")
      .eq("key", binding.prompt_key)
      .single();

    if (prompt) {
      systemPrompt = prompt.system_template;
      userPrompt = prompt.user_template;
    }
  }

  // Fallback prompts if no binding/prompt found
  if (!systemPrompt) {
    systemPrompt = getDefaultSystemPrompt(ctx.stepKey, ctx.language);
  }
  if (!userPrompt) {
    userPrompt = getDefaultUserPrompt(ctx.stepKey);
  }

  // Load Tier 1 KB (always injected)
  const { data: tier1 } = await supabase
    .from("knowledge_base")
    .select("content")
    .eq("tier", 1)
    .eq("is_active", true);

  if (tier1?.length) {
    systemPrompt += "\n\n## Contexto do Canal\n" + tier1.map((k) => k.content).join("\n\n");
  }

  // Variable substitution
  userPrompt = substituteVariables(userPrompt, ctx);

  const result = await callClaude(systemPrompt, userPrompt);

  return {
    output: result.text,
    usage: result.usage,
    duration_ms: Date.now() - start,
  };
}

function substituteVariables(template: string, ctx: ExecutionContext): string {
  let result = template;
  result = result.replace(/\{\{topic\}\}/g, (ctx.input.topic as string) || "");
  result = result.replace(/\{\{title\}\}/g, (ctx.input.title as string) || "");
  result = result.replace(/\{\{language\}\}/g, ctx.language);

  // Substitute previous step outputs
  for (const [key, value] of Object.entries(ctx.previousOutputs)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return result;
}

function getDefaultSystemPrompt(stepKey: string, language: string): string {
  const lang = language === "pt-BR" ? "português brasileiro" : language === "es-ES" ? "español" : "English";

  const prompts: Record<string, string> = {
    ideacao: `Você é um criador de conteúdo para YouTube especializado em gerar conceitos virais.
Gere um conceito criativo e envolvente para um vídeo em ${lang}.
Retorne: título provisório, gancho emocional, público-alvo, ângulo único.`,

    titulo: `Você é um especialista em títulos para YouTube que maximizam CTR.
Gere 5 opções de título em ${lang}. Cada título deve ter:
- Menos de 60 caracteres
- Gancho emocional ou curiosidade
- Palavra-chave relevante
Retorne os 5 títulos numerados, e indique qual é o melhor com [MELHOR].`,

    brief: `Você é um roteirista de vídeos para YouTube.
Expanda o conceito em um brief detalhado em ${lang}. Inclua:
- Protagonistas/vozes
- Conflito ou tensão central
- Emoção predominante
- 3 pontos-chave do vídeo
- Tom e estilo`,

    planejamento: `Você é um arquiteto narrativo de vídeos para YouTube.
Crie a estrutura narrativa completa em ${lang}. Inclua:
- Hook (primeiros 30 segundos)
- Plot points (3-5)
- Clímax
- Resolução
- Call to action
- Pacing (ritmo por seção)
Formato: lista estruturada com timestamps aproximados.`,

    roteiro: `Você é um roteirista profissional de vídeos narrados para YouTube.
Escreva o roteiro completo em ${lang} com pelo menos 1500 palavras.

FORMATO OBRIGATÓRIO:
- Comece com: (voz: NARRADOR)
- Use marcadores de voz: NARRADOR, ESPECIALISTA, OUTRO
- Use pausas: [PAUSA CURTA], [PAUSA], [PAUSA LONGA]
- NÃO use SSML, Markdown, ou tags HTML
- Escreva em formato "stage directions" (direções de cena)

O roteiro deve ser envolvente, com ritmo variado, e manter o espectador até o final.`,

    prompts_cenas: `Você é um diretor visual de vídeos para YouTube.
Analise o roteiro e gere prompts de imagem para cada cena.

Para cada cena, gere:
- Número da cena
- Descrição visual detalhada (para gerador de imagens AI)
- Estilo visual (cinematográfico, ilustração, etc.)
- Mood/atmosfera

Formato: JSON array com objetos { scene: number, prompt: string, style: string, mood: string }`,

    miniaturas: `Você é um designer de thumbnails para YouTube.
Gere 3 descrições detalhadas de miniaturas para este vídeo.

Cada descrição deve incluir:
- Texto overlay (máximo 4 palavras, em ${lang})
- Descrição da imagem de fundo
- Cores dominantes
- Expressão facial (se aplicável)
- Composição`,
  };

  return prompts[stepKey] || `Você é um assistente criativo de produção de vídeos. Execute a etapa "${stepKey}" em ${lang}.`;
}

function getDefaultUserPrompt(stepKey: string): string {
  const prompts: Record<string, string> = {
    ideacao: "Tópico: {{topic}}\n\nGere o conceito do vídeo.",
    titulo: "Conceito:\n{{ideacao}}\n\nGere 5 opções de título.",
    brief: "Título: {{titulo}}\nConceito: {{ideacao}}\n\nExpanda em um brief detalhado.",
    planejamento: "Brief:\n{{brief}}\n\nCrie a estrutura narrativa.",
    roteiro: "Planejamento:\n{{planejamento}}\n\nBrief:\n{{brief}}\n\nEscreva o roteiro completo.",
    prompts_cenas: "Roteiro:\n{{roteiro}}\n\nGere os prompts visuais para cada cena.",
    miniaturas: "Título: {{titulo}}\nConceito: {{ideacao}}\nRoteiro (resumo):\n{{roteiro}}\n\nGere 3 descrições de thumbnail.",
  };

  return prompts[stepKey] || "Entrada: {{topic}}\n\nExecute esta etapa.";
}
