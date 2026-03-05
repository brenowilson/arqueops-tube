-- =============================================================================
-- Migration: 20260305210001_seed_data
-- ArqueOps Tube — Seed data for config and preset tables
-- =============================================================================

-- =============================================================================
-- PROVIDERS
-- =============================================================================

INSERT INTO providers (key, name, type, base_url, config) VALUES
  (
    'claude',
    'Anthropic Claude',
    'llm',
    'https://api.anthropic.com',
    '{"default_model": "claude-sonnet-4-20250514", "max_tokens": 8000}'
  ),
  (
    'azure',
    'Azure Cognitive Services TTS',
    'tts',
    'https://{region}.tts.speech.microsoft.com',
    '{"output_format": "audio-48khz-192kbitrate-mono-mp3", "region": "eastus"}'
  ),
  (
    'imagefx',
    'Google ImageFX',
    'image',
    'https://aisandbox-pa.googleapis.com',
    '{"aspect_ratio": "16:9", "num_images": 1}'
  ),
  (
    'ffmpeg',
    'FFmpeg Local Renderer',
    'render',
    NULL,
    '{"binary": "ffmpeg", "threads": 4}'
  ),
  (
    'local',
    'Local Transform Engine',
    'transform',
    NULL,
    '{}'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- RECIPES
-- =============================================================================

INSERT INTO recipes (key, name, description, steps, default_language) VALUES
  (
    'video-completo',
    'Video Completo (Longform)',
    'Pipeline completo de producao de video longo para YouTube: ideacao, roteiro, TTS, imagens e renderizacao.',
    '[
      {"key": "ideacao",       "type": "llm",       "label": "Ideacao"},
      {"key": "titulo",        "type": "llm",       "label": "Titulo"},
      {"key": "brief",         "type": "llm",       "label": "Brief"},
      {"key": "planejamento",  "type": "llm",       "label": "Planejamento"},
      {"key": "roteiro",       "type": "llm",       "label": "Roteiro"},
      {"key": "prompts_cenas", "type": "llm",       "label": "Prompts de Cenas"},
      {"key": "gerar_imagens", "type": "image",     "label": "Gerar Imagens"},
      {"key": "parse_ssml",    "type": "transform", "label": "Parse SSML"},
      {"key": "tts",           "type": "tts",       "label": "Narracao TTS"},
      {"key": "render",        "type": "render",    "label": "Renderizacao"},
      {"key": "miniaturas",    "type": "llm",       "label": "Miniaturas"},
      {"key": "export",        "type": "render",    "label": "Export"}
    ]'::jsonb,
    'pt-BR'
  ),
  (
    'video-curto',
    'Video Curto (Shorts)',
    'Pipeline simplificado para YouTube Shorts: ideia rapida, roteiro curto, TTS e renderizacao vertical.',
    '[
      {"key": "ideacao",       "type": "llm",       "label": "Ideacao"},
      {"key": "titulo",        "type": "llm",       "label": "Titulo"},
      {"key": "roteiro",       "type": "llm",       "label": "Roteiro"},
      {"key": "parse_ssml",    "type": "transform", "label": "Parse SSML"},
      {"key": "gerar_imagens", "type": "image",     "label": "Gerar Imagens"},
      {"key": "tts",           "type": "tts",       "label": "Narracao TTS"},
      {"key": "render",        "type": "render",    "label": "Renderizacao"},
      {"key": "export",        "type": "render",    "label": "Export"}
    ]'::jsonb,
    'pt-BR'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- PRESETS — VOICE
-- =============================================================================

INSERT INTO presets_voice (key, name, voice_name, language, rate, pitch, style, style_degree) VALUES
  (
    'ximena-multilingual',
    'Ximena Multilingual (es-ES)',
    'es-ES-XimenaMultilingualNeural',
    'es-ES',
    '+0%',
    '+0Hz',
    'friendly',
    0.80
  ),
  (
    'maria-pt',
    'Maria (pt-BR)',
    'pt-BR-FranciscaNeural',
    'pt-BR',
    '+5%',
    '+0Hz',
    'friendly',
    0.90
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- PRESETS — VIDEO
-- =============================================================================

INSERT INTO presets_video (key, name, encoder, width, height, fps, bitrate, audio_codec, audio_rate, format_profile) VALUES
  (
    'longform-1080p',
    'Longform 1080p 30fps',
    'h264_videotoolbox',
    1920,
    1080,
    30,
    '4M',
    'aac',
    48000,
    'longform'
  ),
  (
    'shorts-1080p',
    'Shorts 1080x1920 30fps',
    'h264_videotoolbox',
    1080,
    1920,
    30,
    '3M',
    'aac',
    48000,
    'shorts'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- PRESETS — SSML
-- =============================================================================

INSERT INTO presets_ssml (key, name, pause_mappings) VALUES
  (
    'default-pauses',
    'Default Pause Mappings',
    '{
      "[PAUSA CORTA]":  "300ms",
      "[PAUSA]":        "600ms",
      "[PAUSA LARGA]":  "1200ms",
      "[PAUSA MUITO LARGA]": "2000ms"
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- VALIDATORS
-- =============================================================================

INSERT INTO validators (key, name, type, config) VALUES
  (
    'min-6000-words',
    'Minimo 6000 palavras (roteiro longo)',
    'min_words',
    '{"min": 6000, "field": "content"}'
  ),
  (
    'stage-directions-format',
    'Formato de direcoes de cena',
    'required_patterns',
    '{"patterns": ["\\[CENA \\d+\\]", "\\[PAUSA"], "description": "O roteiro deve conter marcacoes de cena [CENA N] e pausas [PAUSA]."}'
  ),
  (
    'no-ssml',
    'Proibido SSML no roteiro bruto',
    'forbidden_patterns',
    '{"patterns": ["<speak>", "<break", "<prosody", "<emphasis"], "description": "O roteiro nao deve conter tags SSML — o parse_ssml step insere automaticamente."}'
  ),
  (
    'no-markdown',
    'Proibido Markdown no roteiro',
    'forbidden_patterns',
    '{"patterns": ["^#{1,6} ", "\\*\\*", "\\*[^*]", "^- ", "^\\d+\\. "], "description": "O roteiro nao deve conter formatacao Markdown."}'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- KNOWLEDGE BASE
-- =============================================================================

INSERT INTO knowledge_base (key, title, content, tier, category, tags) VALUES
  (
    'canal-dna',
    'DNA do Canal',
    '## DNA do Canal ArqueOps Tube

[PLACEHOLDER — preencher com o DNA real do canal]

Este documento define:
- Missao e posicionamento do canal
- Tom de voz e estilo narrativo
- Publico-alvo (avatar do espectador)
- Temas principais e proibidos
- Formato padrao de videos
- Elementos obrigatorios em todo roteiro

O conteudo deste documento e injetado automaticamente em todos os steps de geracao de roteiro (tier 1 — sempre presente).',
    1,
    'identidade',
    '["dna", "canal", "identidade", "tom-de-voz"]'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- PROMPTS
-- =============================================================================

INSERT INTO prompts (key, name, system_template, user_template, model, max_tokens, temperature, variables, description, category) VALUES
  (
    'ideacao-v1',
    'Ideacao de Video v1',
    'Voce e um estrategista de conteudo especializado em YouTube.

{{canal_dna}}

Sua tarefa e gerar ideias de video altamente clicaveis, educativas e relevantes para o canal.',
    'Gere {{num_ideias}} ideias de video sobre o tema: {{tema}}

Para cada ideia, forneça:
1. Titulo provisorio (com gancho forte)
2. Premissa em uma frase
3. Por que o espectador vai clicar
4. Formato sugerido (tutorial, caso, opiniao, lista)

Responda em JSON no formato:
{
  "ideias": [
    {
      "titulo": "...",
      "premissa": "...",
      "gancho": "...",
      "formato": "..."
    }
  ]
}',
    'claude-sonnet-4-20250514',
    2000,
    0.90,
    '["canal_dna", "tema", "num_ideias"]'::jsonb,
    'Gera ideias de video a partir de um tema, considerando o DNA do canal.',
    'planejamento'
  ),
  (
    'titulo-v1',
    'Geracao de Titulos v1',
    'Voce e um especialista em copywriting para YouTube.

{{canal_dna}}

Voce escreve titulos que maximizam CTR sem clickbait vazio — o titulo deve refletir fielmente o conteudo do video.',
    'Gere 10 opcoes de titulo para o seguinte video:

Premissa: {{premissa}}
Tema principal: {{tema}}
Formato: {{formato}}

Criterios:
- Maximo 70 caracteres
- Incluir numero quando natural
- Usar palavras de poder (segredo, erro, guia, como, por que)
- Evitar clickbait vazio

Responda em JSON:
{
  "titulos": ["...", "...", "..."]
}',
    'claude-sonnet-4-20250514',
    1000,
    0.85,
    '["canal_dna", "premissa", "tema", "formato"]'::jsonb,
    'Gera multiplas opcoes de titulo otimizadas para CTR.',
    'planejamento'
  ),
  (
    'roteiro-v1',
    'Roteiro Completo v1',
    'Voce e um roteirista profissional de YouTube especializado em videos educativos longos.

{{canal_dna}}

REGRAS DE FORMATO OBRIGATORIAS:
- Marcar cada cena com [CENA N] onde N e o numero sequencial
- Usar [PAUSA CORTA] para pausa de 300ms, [PAUSA] para 600ms, [PAUSA LARGA] para 1200ms
- Minimo de 6000 palavras para videos longos
- Nao usar markdown (asteriscos, hashtags, listas com tracos)
- Nao inserir tags SSML — o sistema insere automaticamente
- Escrever exatamente como sera narrado: sem parenteses, sem colchetes alem das marcacoes definidas',
    'Escreva o roteiro completo para o video:

Titulo: {{titulo}}
Premissa: {{premissa}}
Planejamento: {{planejamento}}

Escreva um roteiro envolvente, fluido e educativo. Comece com um gancho forte nos primeiros 30 segundos. Use exemplos concretos, analogias e historias para ilustrar os conceitos.

Estrutura sugerida:
1. Gancho (0-30s): pergunta ou afirmacao provocativa
2. Contexto (30s-2min): por que isso importa
3. Desenvolvimento (2min-18min): conteudo principal com [CENA N]
4. Conclusao (18min-20min): resumo e chamada para acao',
    'claude-sonnet-4-20250514',
    8000,
    0.70,
    '["canal_dna", "titulo", "premissa", "planejamento"]'::jsonb,
    'Gera o roteiro completo do video seguindo as regras de formato para TTS e renderizacao.',
    'roteiro'
  )
ON CONFLICT (key) DO NOTHING;
