-- =============================================================================
-- Migration: 20260306120000_youtube_channels
-- Adds youtube_channels table and links to jobs
-- =============================================================================

CREATE TABLE IF NOT EXISTS youtube_channels (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  handle      TEXT,
  url         TEXT,
  description TEXT,
  language    TEXT        DEFAULT 'pt-BR',
  niche       TEXT,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_youtube_channels_updated_at
  BEFORE UPDATE ON youtube_channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Link jobs to channels
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES youtube_channels(id);
