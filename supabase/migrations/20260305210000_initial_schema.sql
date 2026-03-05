-- =============================================================================
-- Migration: 20260305210000_initial_schema
-- ArqueOps Tube — Initial PostgreSQL/Supabase schema
-- Adapted from Video Factory OS (SQLite)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- updated_at trigger function (reused across all tables)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CONFIG TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- prompts — LLM prompt templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS prompts (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key              TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  system_template  TEXT        NOT NULL,
  user_template    TEXT        NOT NULL,
  model            TEXT        DEFAULT 'claude-sonnet-4-20250514',
  max_tokens       INTEGER     DEFAULT 8000,
  temperature      NUMERIC(3,2) DEFAULT 0.7,
  variables        JSONB       DEFAULT '[]',
  description      TEXT,
  category         TEXT,
  version          INTEGER     DEFAULT 1,
  is_active        BOOLEAN     DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- providers — Execution providers (LLM, TTS, image, render, transform)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS providers (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('llm', 'tts', 'image', 'render', 'transform')),
  base_url   TEXT,
  config     JSONB       DEFAULT '{}',
  is_active  BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- recipes — Pipeline definitions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recipes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key              TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  description      TEXT,
  steps            JSONB       NOT NULL, -- JSON array of step definitions
  default_language TEXT        DEFAULT 'pt-BR',
  version          INTEGER     DEFAULT 1,
  is_active        BOOLEAN     DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- knowledge_base — Context documents with tiers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS knowledge_base (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL UNIQUE,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  tier       INTEGER     NOT NULL CHECK (tier IN (1, 2, 3)),
  category   TEXT,
  tags       JSONB       DEFAULT '[]',
  is_active  BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- validators — Validation rules as data
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS validators (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN (
               'regex',
               'min_words',
               'max_words',
               'forbidden_patterns',
               'required_patterns',
               'json_schema'
             )),
  config     JSONB       NOT NULL,
  is_active  BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- execution_bindings — Wiring between recipe steps and config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS execution_bindings (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_key    TEXT        NOT NULL REFERENCES recipes(key),
  step_key      TEXT        NOT NULL,
  prompt_key    TEXT        REFERENCES prompts(key),
  provider_key  TEXT        NOT NULL REFERENCES providers(key),
  preset_key    TEXT,
  kb_keys       JSONB       DEFAULT '{}', -- { "tier2": [...], "tier3": [...] }
  validator_keys JSONB      DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_key, step_key)
);

-- =============================================================================
-- PRESET TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- presets_voice — Azure TTS configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS presets_voice (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key           TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  voice_name    TEXT        NOT NULL,
  language      TEXT        NOT NULL,
  rate          TEXT        DEFAULT '+0%',
  pitch         TEXT        DEFAULT '+0Hz',
  style         TEXT,
  style_degree  NUMERIC(3,2),
  role          TEXT,
  prosody       JSONB       DEFAULT '{}',
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- presets_video — FFmpeg encoder configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS presets_video (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key            TEXT        NOT NULL UNIQUE,
  name           TEXT        NOT NULL,
  encoder        TEXT        DEFAULT 'h264_videotoolbox',
  width          INTEGER     DEFAULT 1920,
  height         INTEGER     DEFAULT 1080,
  fps            INTEGER     DEFAULT 30,
  bitrate        TEXT        DEFAULT '4M',
  audio_codec    TEXT        DEFAULT 'aac',
  audio_rate     INTEGER     DEFAULT 48000,
  format_profile TEXT        DEFAULT 'longform' CHECK (format_profile IN ('longform', 'shorts')),
  is_active      BOOLEAN     DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- presets_ssml — Pause mappings for SSML transform step
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS presets_ssml (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key            TEXT        NOT NULL UNIQUE,
  name           TEXT        NOT NULL,
  pause_mappings JSONB       NOT NULL, -- { "[PAUSA CORTA]": "300ms", "[PAUSA]": "600ms", "[PAUSA LARGA]": "1200ms" }
  is_active      BOOLEAN     DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- EXECUTION STATE TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- jobs — Video production jobs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_key      TEXT        NOT NULL REFERENCES recipes(key),
  title           TEXT        NOT NULL,
  input           JSONB       DEFAULT '{}',
  state           TEXT        NOT NULL DEFAULT 'DRAFT' CHECK (state IN (
                    'DRAFT',
                    'READY',
                    'SCRIPTING',
                    'SCRIPT_DONE',
                    'TTS_RUNNING',
                    'TTS_DONE',
                    'RENDER_READY',
                    'RENDER_RUNNING',
                    'DONE',
                    'FAILED',
                    'CANCELLED'
                  )),
  progress        INTEGER     DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  language        TEXT        DEFAULT 'pt-BR',
  duration_preset TEXT,
  manifest        JSONB,      -- Config snapshot for reproducibility
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- job_steps — Per-step execution status within a job
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_steps (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id       UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  step_key     TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN (
                 'pending',
                 'running',
                 'completed',
                 'failed',
                 'skipped'
               )),
  input_hash   TEXT,
  output       JSONB,
  artifacts    JSONB       DEFAULT '[]',
  error        TEXT,
  locked_at    TIMESTAMPTZ,
  locked_by    TEXT,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(job_id, step_key)
);

-- ---------------------------------------------------------------------------
-- job_events — Immutable audit trail for job lifecycle
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_events (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id     UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN (
               'step_started',
               'step_progress',
               'step_completed',
               'step_failed',
               'state_changed',
               'error',
               'user_action'
             )),
  data       JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- artifacts — Generated files produced by job steps
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS artifacts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  step_key    TEXT        NOT NULL,
  path        TEXT        NOT NULL,
  mime_type   TEXT,
  file_size   BIGINT,
  version     INTEGER     DEFAULT 1,
  metadata    JSONB       DEFAULT '{}',
  storage_key TEXT,       -- Supabase Storage key
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_state        ON jobs(state);
CREATE INDEX IF NOT EXISTS idx_jobs_recipe_key   ON jobs(recipe_key);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at   ON jobs(created_at DESC);

-- job_steps
CREATE INDEX IF NOT EXISTS idx_job_steps_job_id  ON job_steps(job_id, step_key);
CREATE INDEX IF NOT EXISTS idx_job_steps_status  ON job_steps(status);

-- job_events
CREATE INDEX IF NOT EXISTS idx_job_events_job_id ON job_events(job_id, created_at DESC);

-- artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_job_id  ON artifacts(job_id, step_key);

-- execution_bindings
CREATE INDEX IF NOT EXISTS idx_exec_bindings_recipe ON execution_bindings(recipe_key);

-- knowledge_base
CREATE INDEX IF NOT EXISTS idx_kb_tier_active    ON knowledge_base(tier, is_active);

-- prompts
CREATE INDEX IF NOT EXISTS idx_prompts_category  ON prompts(category);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE prompts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base     ENABLE ROW LEVEL SECURITY;
ALTER TABLE validators         ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets_voice      ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets_video      ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets_ssml       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts          ENABLE ROW LEVEL SECURITY;

-- Permissive policies — allow all authenticated and service_role access.
-- Tighten per-table policies in a subsequent migration once auth roles are defined.

CREATE POLICY "authenticated_all_prompts"
  ON prompts FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_providers"
  ON providers FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_recipes"
  ON recipes FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_knowledge_base"
  ON knowledge_base FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_validators"
  ON validators FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_execution_bindings"
  ON execution_bindings FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_presets_voice"
  ON presets_voice FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_presets_video"
  ON presets_video FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_presets_ssml"
  ON presets_ssml FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_jobs"
  ON jobs FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_job_steps"
  ON job_steps FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_job_events"
  ON job_events FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_artifacts"
  ON artifacts FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE job_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE job_events;
