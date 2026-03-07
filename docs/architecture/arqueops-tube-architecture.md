# ArqueOps Tube — Architecture Document

> **Status**: Foundation Architecture
> **Author**: Salomao (System Architect)
> **Date**: 2026-03-07
> **Demand**: Strategic architecture of ArqueOps Tube as an autonomous business unit

---

## 1. Executive Summary

ArqueOps Tube is an autonomous YouTube video production platform that operates as a
business unit (department/sector) within the ArqueOps ecosystem. It manages multiple
YouTube channels — both existing (added via OAuth) and autonomously created (via AI
niche analysis) — and produces videos on a 6-hour cadence per channel using a 12-step
pipeline (ideation through export + upload).

This document defines the module architecture, data flows, provider registry, OAuth
integration, autonomous channel creation, production scheduling, and the integration
contract with the ArqueOps Platform.

---

## 2. Module Architecture

The system is organized into four bounded modules, each with clear responsibilities
and contracts. Dependencies flow inward following Clean Architecture principles.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ArqueOps Tube                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Channels   │  │  Productions │  │  Providers   │              │
│  │   Module     │  │  Module      │  │  Module      │              │
│  │              │  │              │  │              │              │
│  │ • OAuth flow │  │ • Scheduler  │  │ • Registry   │              │
│  │ • Channel    │  │ • Pipeline   │  │ • API Key    │              │
│  │   CRUD       │  │   Engine     │  │   Vault      │              │
│  │ • Niche      │  │ • Job state  │  │ • Health     │              │
│  │   analysis   │  │   machine    │  │   checks     │              │
│  │ • YouTube    │  │ • Artifact   │  │ • Usage      │              │
│  │   Data API   │  │   storage    │  │   tracking   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └────────┬────────┴────────┬────────┘                      │
│                  │                 │                                │
│         ┌────────▼─────────────────▼────────┐                      │
│         │         Integrations Module        │                     │
│         │                                    │                     │
│         │  • ArqueOps Platform connector     │                     │
│         │  • YouTube Data API v3 gateway     │                     │
│         │  • Supabase (DB, Auth, Storage)    │                     │
│         │  • Webhook/event bridge            │                     │
│         └────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Channels Module (`src/lib/channels/`)

Manages the lifecycle of YouTube channels — from onboarding (OAuth) or autonomous
creation (niche analysis) through ongoing operation.

**Responsibilities**:
- Store channel metadata (name, handle, niche, language, schedule config)
- Manage OAuth tokens for existing channels (token refresh, revocation)
- Drive autonomous channel creation via niche analysis + Google Account API
- Track channel health: subscriber count, view velocity, monetization status
- Associate channels with production schedules

**Key entities**: `youtube_channels`, `channel_oauth_tokens`, `channel_analytics`

### 2.2 Productions Module (`src/lib/productions/`)

Orchestrates automated video production on a per-channel cadence. This module
wraps the existing 12-step engine (`src/lib/engine/`) and adds scheduling,
channel-aware configuration, and upload.

**Responsibilities**:
- Schedule production runs per channel (default: every 6 hours)
- Select recipe + niche-specific prompts per channel
- Execute the 12-step pipeline via the existing engine
- Upload finished video to YouTube via Data API v3
- Track production history and performance metrics per channel

**Key entities**: `production_schedules`, `jobs` (existing), `production_runs`

### 2.3 Providers Module (`src/lib/providers/`)

Registry of external service providers with encrypted API key management.

**Responsibilities**:
- Register and configure providers (LLM, TTS, Image, Render, YouTube API)
- Securely store API keys with encryption at rest
- Track usage, quotas, and costs per provider
- Health-check providers and auto-failover
- Expose provider capabilities to the pipeline engine

**Key entities**: `providers` (existing, extended), `provider_api_keys`, `provider_usage_log`

### 2.4 Integrations Module (`src/lib/integrations/`)

Bridges ArqueOps Tube to external systems: the ArqueOps Platform (as a
department/sector), YouTube Data API, and Supabase infrastructure.

**Responsibilities**:
- Expose department API for ArqueOps Platform orchestrator
- Report KPIs (videos produced, channels active, revenue) to platform
- Accept demands from ArqueOps orchestrator
- Manage YouTube Data API v3 client (upload, analytics, channel management)

---

## 3. OAuth Flow — Adding an Existing YouTube Channel

This flow allows a user to connect an existing YouTube channel to ArqueOps Tube
using Google OAuth 2.0.

### 3.1 Sequence Diagram

```
┌──────┐       ┌──────────┐       ┌─────────┐       ┌─────────┐       ┌──────────┐
│ User │       │ Next.js  │       │ Google  │       │Supabase │       │ YouTube  │
│      │       │ Frontend │       │  OAuth  │       │   DB    │       │ Data API │
└──┬───┘       └────┬─────┘       └────┬────┘       └────┬────┘       └─────┬────┘
   │                │                   │                 │                  │
   │ 1. Click       │                   │                 │                  │
   │ "Add Channel"  │                   │                 │                  │
   │───────────────>│                   │                 │                  │
   │                │                   │                 │                  │
   │                │ 2. Generate state │                 │                  │
   │                │    + PKCE code    │                 │                  │
   │                │    verifier      │                 │                  │
   │                │──────────────────>│                 │                  │
   │                │                   │                 │                  │
   │ 3. Redirect to │                   │                 │                  │
   │    Google OAuth │                   │                 │                  │
   │<───────────────│                   │                 │                  │
   │                │                   │                 │                  │
   │ 4. User grants │                   │                 │                  │
   │    permissions  │                   │                 │                  │
   │───────────────────────────────────>│                 │                  │
   │                │                   │                 │                  │
   │ 5. Redirect    │                   │                 │                  │
   │    with code   │                   │                 │                  │
   │───────────────>│                   │                 │                  │
   │                │                   │                 │                  │
   │                │ 6. Exchange code  │                 │                  │
   │                │    for tokens     │                 │                  │
   │                │    (server-side)  │                 │                  │
   │                │──────────────────>│                 │                  │
   │                │                   │                 │                  │
   │                │ 7. Receive        │                 │                  │
   │                │    access_token + │                 │                  │
   │                │    refresh_token  │                 │                  │
   │                │<──────────────────│                 │                  │
   │                │                   │                 │                  │
   │                │ 8. Fetch channel  │                 │                  │
   │                │    info           │                 │                  │
   │                │─────────────────────────────────────────────────────>│
   │                │                   │                 │                  │
   │                │ 9. Channel data   │                 │                  │
   │                │    (id, title,    │                 │                  │
   │                │     handle, subs) │                 │                  │
   │                │<─────────────────────────────────────────────────────│
   │                │                   │                 │                  │
   │                │ 10. Store channel │                 │                  │
   │                │     + encrypted   │                 │                  │
   │                │     tokens        │                 │                  │
   │                │────────────────────────────────────>│                  │
   │                │                   │                 │                  │
   │ 11. Success:   │                   │                 │                  │
   │     channel    │                   │                 │                  │
   │     connected  │                   │                 │                  │
   │<───────────────│                   │                 │                  │
```

### 3.2 OAuth Technical Details

**Scopes required**:
```
https://www.googleapis.com/auth/youtube.upload
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube.force-ssl
https://www.googleapis.com/auth/yt-analytics.readonly
```

**Token flow**:
1. Authorization Code flow with PKCE (S256 challenge)
2. `state` parameter stores a random UUID, verified on callback
3. Server-side token exchange via `POST https://oauth2.googleapis.com/token`
4. `refresh_token` encrypted with AES-256-GCM before storage (see Section 6)
5. `access_token` is short-lived (1h), refreshed on demand via refresh token
6. Token refresh handled by a `TokenManager` service that checks expiry before
   every YouTube API call

**API route structure**:
```
/api/channels/oauth/authorize    → GET  → Redirect to Google
/api/channels/oauth/callback     → GET  → Handle code exchange
/api/channels/oauth/revoke       → POST → Revoke tokens + disconnect
/api/channels/[id]/refresh-token → POST → Force token refresh
```

**Database impact**: Extends `youtube_channels` table with OAuth fields
(see Section 6 for full schema).

---

## 4. Autonomous Channel Creation via Niche Analysis

This flow enables ArqueOps Tube to autonomously identify profitable YouTube niches,
create Google/YouTube accounts, and begin producing content — the core of the "dark
channel" business model.

### 4.1 Process Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                 Autonomous Channel Creation Flow                    │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  Step 1   │    │  Step 2   │    │  Step 3   │    │  Step 4   │     │
│  │  Niche    │───>│  Channel  │───>│  Content  │───>│  First    │     │
│  │  Analysis │    │  Setup    │    │  Strategy │    │Production │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Step 1 — Niche Analysis (AI-Driven)

**Input**: Market signals, trending topics, gap analysis data
**Agent**: Claude (via Anthropic API)
**Process**:

1. **Market research**: Query YouTube Data API for trending categories, search
   volumes, and competitor analysis in target languages (pt-BR, en-US, es-ES)
2. **Gap identification**: Claude analyzes niches with high demand but low
   competition — the "blue ocean" zones
3. **Profitability scoring**: Each niche receives a score based on:
   - CPM estimate for the niche/geography
   - Content production cost (tokens + TTS + images)
   - Estimated views per video (based on comparable channels)
   - Time to monetization (1000 subs + 4000 watch hours)
4. **Niche proposal**: Claude generates a structured proposal with:
   - Channel name suggestions (3 options)
   - Content pillars (3-5 topics)
   - Target audience description
   - Posting frequency recommendation
   - Estimated monthly revenue at 6/12/24 months
   - Required prompts/knowledge base for the niche

**Output**: `NicheProposal` stored in `niche_proposals` table

### 4.3 Step 2 — Channel Setup

**Important boundary**: Autonomous Google Account creation is currently a MANUAL
step due to Google's Terms of Service. The system prepares everything but requires
human action for account creation.

**Automated parts**:
- Generate channel branding (name, description, tags, banner prompt, avatar prompt)
- Generate initial knowledge base entries for the niche
- Create niche-specific prompt templates
- Prepare production schedule configuration

**Manual parts** (human escalation):
- Create Google Account
- Create YouTube channel via YouTube Studio
- Complete OAuth flow to connect channel to ArqueOps Tube
- Configure AdSense account linkage

**After manual setup**: System auto-detects the new channel via OAuth callback and
begins automated production immediately.

### 4.4 Step 3 — Content Strategy

Once the channel is connected, Claude generates:
- 30-day content calendar (initial batch of video topics)
- SEO strategy per video (title patterns, tag sets, description templates)
- Thumbnail style guide
- Channel keywords and about page content

### 4.5 Step 4 — First Production Run

The scheduler triggers the first production cycle, using channel-specific
configuration (niche prompts, voice preset, video preset, language).

---

## 5. Production Pipeline — 6-Hour Cycle

### 5.1 Existing 12-Step Engine (Already Implemented)

The production engine already exists in `src/lib/engine/` with these steps:

| # | Step Key | Kind | Description | Provider |
|---|----------|------|-------------|----------|
| 1 | `ideacao` | llm | Topic ideation from niche + calendar | Claude |
| 2 | `titulo` | llm | SEO-optimized title generation | Claude |
| 3 | `brief` | llm | Content brief with structure | Claude |
| 4 | `planejamento` | llm | Detailed scene-by-scene plan | Claude |
| 5 | `roteiro` | llm | Full narration script | Claude |
| 6 | `prompts_cenas` | scene_prompts | Scene splitting + image prompt generation | Claude |
| 7 | `gerar_imagens` | generate_images | Image generation per scene | ImageFX |
| 8 | `parse_ssml` | transform | SSML transformation with pause markers | Local |
| 9 | `tts` | tts | Azure Batch TTS narration | Azure |
| 10 | `render` | render | FFmpeg video assembly (VideoToolbox) | FFmpeg |
| 11 | `miniaturas` | llm | Thumbnail generation prompts | Claude |
| 12 | `export` | export | Artifact packaging + manifest | Local |

### 5.2 New Step: YouTube Upload (Step 13)

A new step is needed to close the loop:

| # | Step Key | Kind | Description | Provider |
|---|----------|------|-------------|----------|
| 13 | `upload` | upload | Upload to YouTube via Data API v3 | YouTube |

**Upload step responsibilities**:
- Read video file from export artifacts
- Read metadata (title, description, tags) from pipeline outputs
- Upload via YouTube Data API v3 resumable upload
- Set video as unlisted initially (for review) or public (autonomous mode)
- Store YouTube video ID in `jobs.youtube_video_id`
- Set thumbnail via API

### 5.3 Production Scheduler

The scheduler operates on a per-channel cadence:

```
┌──────────────────────────────────────────────────────────────────┐
│                   Production Scheduler                           │
│                                                                  │
│  Input: channels with is_active=true AND production_enabled=true │
│                                                                  │
│  for each channel:                                               │
│    ┌──────────────────────────────────────┐                      │
│    │ 1. Check: last_production_at +       │                      │
│    │    interval_hours > now()?           │                      │
│    │    If no → skip                      │                      │
│    ├──────────────────────────────────────┤                      │
│    │ 2. Check: active jobs count <        │                      │
│    │    max_concurrent_jobs?              │                      │
│    │    If no → skip                      │                      │
│    ├──────────────────────────────────────┤                      │
│    │ 3. Check: provider quotas OK?        │                      │
│    │    (API limits, costs)               │                      │
│    │    If no → skip + log warning        │                      │
│    ├──────────────────────────────────────┤                      │
│    │ 4. Select content from channel's     │                      │
│    │    content calendar                  │                      │
│    ├──────────────────────────────────────┤                      │
│    │ 5. Create job with channel_id,       │                      │
│    │    recipe_key, niche-specific input  │                      │
│    ├──────────────────────────────────────┤                      │
│    │ 6. Execute pipeline (steps 1-13)     │                      │
│    ├──────────────────────────────────────┤                      │
│    │ 7. Update last_production_at         │                      │
│    └──────────────────────────────────────┘                      │
│                                                                  │
│  Trigger: Supabase pg_cron (every 30 min check)                  │
│  OR: Next.js cron route (/api/cron/produce)                      │
└──────────────────────────────────────────────────────────────────┘
```

**Scheduling configuration per channel** (stored in `production_schedules`):
- `interval_hours`: Production cadence (default: 6)
- `max_concurrent_jobs`: Limit parallel productions (default: 1)
- `active_hours`: Window for production (e.g., "06:00-22:00")
- `recipe_key`: Which pipeline recipe to use
- `auto_publish`: Upload as public or unlisted
- `content_calendar_id`: Reference to pre-generated content plan

### 5.4 Pipeline Execution Timeline (6h Cycle)

```
Hour 0:00 ─── Scheduler triggers production
  │
  ├── Steps 1-5 (LLM): ~15-30 min
  │   Ideation → Title → Brief → Planning → Script
  │
  ├── Step 6 (Scene Prompts): ~5-10 min
  │   Split script + generate image prompts
  │
  ├── Step 7 (Image Gen): ~15-30 min
  │   Generate 7-15 images via ImageFX
  │   (3s delay between requests for rate limiting)
  │
  ├── Step 8 (SSML Transform): ~1 min
  │   Parse script → SSML with pause markers
  │
  ├── Step 9 (TTS): ~10-30 min
  │   Azure Batch Synthesis (create + poll + download)
  │
  ├── Step 10 (Render): ~5-15 min
  │   FFmpeg assembly with VideoToolbox acceleration
  │
  ├── Step 11 (Thumbnails): ~2-5 min
  │   Generate thumbnail prompt + image
  │
  ├── Step 12 (Export): ~1 min
  │   Package artifacts + manifest
  │
  └── Step 13 (Upload): ~5-15 min
      YouTube Data API resumable upload + metadata

Total: ~60-140 min per production
Remaining: ~4-5h buffer before next cycle
```

---

## 6. Provider Registry & API Key Vault

### 6.1 Extended Provider Model

The existing `providers` table stores provider metadata. We extend it with a
separate `provider_api_keys` table for encrypted credential storage.

**Why separate tables?**
- Separation of concerns: provider config vs. secrets
- Different RLS policies: keys require stricter access
- Audit trail: key rotation/access can be logged independently
- Multiple keys per provider (e.g., primary + fallback API keys)

### 6.2 Data Model

```sql
-- Extends existing providers table with usage tracking
ALTER TABLE providers ADD COLUMN IF NOT EXISTS
  category TEXT DEFAULT 'production'
  CHECK (category IN ('llm', 'tts', 'image', 'render', 'transform', 'platform'));
ALTER TABLE providers ADD COLUMN IF NOT EXISTS
  monthly_quota JSONB DEFAULT '{}';
  -- e.g., {"max_requests": 10000, "max_cost_usd": 50.00}
ALTER TABLE providers ADD COLUMN IF NOT EXISTS
  health_status TEXT DEFAULT 'healthy'
  CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown'));
ALTER TABLE providers ADD COLUMN IF NOT EXISTS
  last_health_check TIMESTAMPTZ;

-- New: Encrypted API key storage
CREATE TABLE provider_api_keys (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id     UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  key_name        TEXT        NOT NULL,
  -- Encrypted value: AES-256-GCM(plaintext_key, vault_master_key)
  encrypted_value TEXT        NOT NULL,
  -- IV for AES-GCM (unique per encryption)
  encryption_iv   TEXT        NOT NULL,
  -- Auth tag from AES-GCM
  encryption_tag  TEXT        NOT NULL,
  -- Which environment this key is for
  environment     TEXT        DEFAULT 'production'
    CHECK (environment IN ('production', 'staging', 'development')),
  is_active       BOOLEAN     DEFAULT true,
  expires_at      TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  last_rotated_at TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one active key per provider per environment per key_name
CREATE UNIQUE INDEX idx_provider_keys_active
  ON provider_api_keys(provider_id, key_name, environment)
  WHERE is_active = true;

-- Usage tracking
CREATE TABLE provider_usage_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID        NOT NULL REFERENCES providers(id),
  job_id      UUID        REFERENCES jobs(id),
  step_key    TEXT,
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    NUMERIC(10,6),
  latency_ms  INTEGER,
  success     BOOLEAN     NOT NULL,
  error_code  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_provider_date
  ON provider_usage_log(provider_id, created_at DESC);
```

### 6.3 Encryption Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  API Key Encryption Flow                     │
│                                                             │
│  Plaintext Key                                              │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────┐               │
│  │  AES-256-GCM Encryption                 │               │
│  │                                         │               │
│  │  Input:                                 │               │
│  │    plaintext  = "sk-ant-api03-xxx..."   │               │
│  │    key        = VAULT_MASTER_KEY (env)  │               │
│  │    iv         = crypto.randomBytes(12)  │               │
│  │                                         │               │
│  │  Output:                                │               │
│  │    encrypted_value = base64(ciphertext) │               │
│  │    encryption_iv   = base64(iv)         │               │
│  │    encryption_tag  = base64(authTag)    │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  VAULT_MASTER_KEY:                                          │
│    • 256-bit key stored ONLY in environment variables       │
│    • Never in DB, never in code, never in git               │
│    • Set via Supabase Edge Function secrets or .env.local   │
│    • Derived from: crypto.randomBytes(32).toString('hex')   │
│                                                             │
│  Decryption:                                                │
│    • Happens server-side only (server components / API)     │
│    • Decrypted value is NEVER sent to client                │
│    • Decrypted value is passed directly to provider SDK     │
│    • Decrypted value is NEVER logged                        │
│                                                             │
│  Key rotation:                                              │
│    • Insert new key row with is_active=true                 │
│    • Set old key is_active=false                            │
│    • Old encrypted values remain for audit trail            │
└─────────────────────────────────────────────────────────────┘
```

**Implementation** (`src/lib/providers/vault.ts`):
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const key = process.env.VAULT_MASTER_KEY;
  if (!key) throw new Error('VAULT_MASTER_KEY not configured');
  return Buffer.from(key, 'hex'); // 32 bytes = 256 bits
}

export function encrypt(plaintext: string): {
  encryptedValue: string;
  iv: string;
  tag: string;
} {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return {
    encryptedValue: encrypted,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decrypt(encryptedValue: string, iv: string, tag: string): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  let decrypted = decipher.update(encryptedValue, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 6.4 Provider Registry — Complete Provider Map

| Provider Key | Type | Service | Key Name | Key Source |
|-------------|------|---------|----------|------------|
| `claude` | llm | Anthropic Claude | `ANTHROPIC_API_KEY` | Vault |
| `azure` | tts | Azure Speech Services | `AZURE_SPEECH_KEY` | Vault |
| `imagefx` | image | Google ImageFX | `IMAGEFX_COOKIES` | Vault |
| `ffmpeg` | render | FFmpeg Local | (none) | Local binary |
| `local` | transform | SSML Transform | (none) | Local code |
| `youtube` | platform | YouTube Data API v3 | `GOOGLE_CLIENT_SECRET` | Vault |
| `youtube` | platform | YouTube Data API v3 | OAuth tokens per channel | Vault |

---

## 7. YouTube Channels — Extended Data Model

### 7.1 Schema Changes

```sql
-- Extend existing youtube_channels table
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  youtube_channel_id TEXT;          -- YouTube's channel ID (UC...)
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('oauth', 'autonomous', 'manual'));
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  production_enabled BOOLEAN DEFAULT false;
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  auto_publish BOOLEAN DEFAULT false;
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  subscriber_count INTEGER DEFAULT 0;
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  total_views BIGINT DEFAULT 0;
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  monetization_status TEXT DEFAULT 'not_eligible'
    CHECK (monetization_status IN (
      'not_eligible', 'eligible', 'enabled', 'suspended'
    ));
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  adsense_linked BOOLEAN DEFAULT false;
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  last_production_at TIMESTAMPTZ;
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS
  config JSONB DEFAULT '{}';
  -- Channel-specific overrides: recipe_key, voice_preset, video_preset, etc.

-- OAuth tokens (encrypted, separate table)
CREATE TABLE channel_oauth_tokens (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id      UUID        NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  -- Encrypted via vault (same as provider_api_keys)
  access_token_encrypted   TEXT NOT NULL,
  access_token_iv          TEXT NOT NULL,
  access_token_tag         TEXT NOT NULL,
  refresh_token_encrypted  TEXT NOT NULL,
  refresh_token_iv         TEXT NOT NULL,
  refresh_token_tag        TEXT NOT NULL,
  token_type      TEXT        DEFAULT 'Bearer',
  expires_at      TIMESTAMPTZ NOT NULL,
  scopes          TEXT[]      NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id)
);

CREATE TRIGGER trg_channel_oauth_tokens_updated_at
  BEFORE UPDATE ON channel_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Production schedules (per channel)
CREATE TABLE production_schedules (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id          UUID        NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  recipe_key          TEXT        NOT NULL REFERENCES recipes(key),
  interval_hours      INTEGER     DEFAULT 6 CHECK (interval_hours >= 1),
  max_concurrent_jobs INTEGER     DEFAULT 1,
  active_hours_start  TIME        DEFAULT '00:00',
  active_hours_end    TIME        DEFAULT '23:59',
  timezone            TEXT        DEFAULT 'America/Sao_Paulo',
  is_active           BOOLEAN     DEFAULT true,
  next_run_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id)
);

CREATE TRIGGER trg_production_schedules_updated_at
  BEFORE UPDATE ON production_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Content calendar (pre-generated topics per channel)
CREATE TABLE content_calendar (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id  UUID        NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  topic       TEXT        NOT NULL,
  description TEXT,
  keywords    JSONB       DEFAULT '[]',
  priority    INTEGER     DEFAULT 0,
  status      TEXT        DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'producing', 'published', 'skipped')),
  scheduled_for TIMESTAMPTZ,
  job_id      UUID        REFERENCES jobs(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_calendar_channel
  ON content_calendar(channel_id, status, priority DESC);

-- Niche proposals (for autonomous channel creation)
CREATE TABLE niche_proposals (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  niche_name       TEXT        NOT NULL,
  language         TEXT        NOT NULL,
  channel_names    JSONB       NOT NULL, -- ["name1", "name2", "name3"]
  content_pillars  JSONB       NOT NULL, -- ["topic1", "topic2", ...]
  target_audience  TEXT        NOT NULL,
  cpm_estimate     NUMERIC(8,2),
  production_cost  NUMERIC(8,2),
  monthly_revenue_estimate JSONB, -- {"6m": 100, "12m": 500, "24m": 2000}
  competition_score NUMERIC(3,2), -- 0.0 (saturated) to 1.0 (blue ocean)
  status           TEXT        DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'rejected', 'creating', 'active')),
  channel_id       UUID        REFERENCES youtube_channels(id),
  analysis_data    JSONB       DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend jobs table for YouTube integration
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS
  youtube_video_id TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS
  upload_status TEXT
    CHECK (upload_status IN ('pending', 'uploading', 'processing', 'published', 'failed'));
```

### 7.2 Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────────┐
│ youtube_channels │     │ channel_oauth_tokens  │
│──────────────────│     │──────────────────────│
│ id (PK)          │◄───┤ channel_id (FK)       │
│ name             │  1:1│ access_token_enc      │
│ handle           │     │ refresh_token_enc     │
│ youtube_channel_id│     │ expires_at            │
│ niche            │     └──────────────────────┘
│ language         │
│ source           │     ┌──────────────────────┐
│ production_enabled│     │ production_schedules  │
│ auto_publish     │     │──────────────────────│
│ monetization_stat│◄───┤ channel_id (FK)       │
│ config (JSONB)   │  1:1│ recipe_key (FK)       │
│ is_active        │     │ interval_hours        │
└────────┬─────────┘     │ next_run_at           │
         │               └──────────────────────┘
         │
         │ 1:N          ┌──────────────────────┐
         ├──────────────┤ content_calendar      │
         │              │──────────────────────│
         │              │ channel_id (FK)       │
         │              │ topic                 │
         │              │ status                │
         │              │ job_id (FK)           │
         │              └──────────────────────┘
         │
         │ 1:N          ┌──────────────────────┐
         ├──────────────┤ jobs (existing)       │
         │              │──────────────────────│
         │              │ channel_id (FK)       │
         │              │ youtube_video_id      │
         │              │ upload_status         │
         │              └──────────────────────┘
         │
         │ 1:N(?)       ┌──────────────────────┐
         └──────────────┤ niche_proposals       │
                        │──────────────────────│
                        │ channel_id (FK, opt.) │
                        │ niche_name            │
                        │ status                │
                        └──────────────────────┘

┌──────────────────┐     ┌──────────────────────┐
│ providers (ext.) │     │ provider_api_keys     │
│──────────────────│     │──────────────────────│
│ id (PK)          │◄───┤ provider_id (FK)      │
│ key              │  1:N│ key_name              │
│ type             │     │ encrypted_value       │
│ health_status    │     │ encryption_iv         │
│ monthly_quota    │     │ encryption_tag        │
└──────────────────┘     │ environment           │
                         └──────────────────────┘
```

---

## 8. ArqueOps Platform Integration

### 8.1 Integration as Department/Sector

ArqueOps Tube integrates with the ArqueOps Platform as a **sector** (department),
following the organizational model defined in the Platform's `Setores/Departamentos`
concept.

**Department definition**:
```json
{
  "name": "YouTube",
  "slug": "youtube",
  "mission": "Produzir e monetizar conteudo de video em canais YouTube de forma 100% autonoma",
  "kpis": [
    "videos_produced_per_week",
    "total_channels_active",
    "monthly_revenue_adsense",
    "average_views_per_video",
    "subscriber_growth_rate"
  ],
  "project_slug": "arqueops-tube",
  "supabase_url": "https://zackpaccyxhnagrjhysv.supabase.co"
}
```

### 8.2 Integration Contract

The ArqueOps Platform orchestrator communicates with ArqueOps Tube through a
**REST API contract**. ArqueOps Tube exposes these endpoints:

```
/api/platform/status        → GET  → Department health + KPIs
/api/platform/demands       → POST → Receive demands from orchestrator
/api/platform/report        → GET  → Periodic report (channels, videos, revenue)
```

**Status response contract**:
```typescript
interface DepartmentStatus {
  department: "youtube";
  status: "operational" | "degraded" | "down";
  kpis: {
    channels_active: number;
    channels_total: number;
    videos_produced_24h: number;
    videos_produced_7d: number;
    jobs_running: number;
    jobs_queued: number;
    providers_healthy: number;
    providers_total: number;
    estimated_monthly_revenue_usd: number;
  };
  last_production_at: string;     // ISO timestamp
  next_production_at: string;     // ISO timestamp
  provider_health: Record<string, "healthy" | "degraded" | "down">;
}
```

**Demand acceptance contract**:
```typescript
interface IncomingDemand {
  demand_id: string;           // ArqueOps demand UUID
  type: "create_channel" | "produce_video" | "analyze_niche" | "update_config";
  payload: Record<string, unknown>;
  priority: "low" | "medium" | "high" | "critical";
  requester_agent: string;     // ArqueOps agent who created the demand
}

interface DemandResponse {
  accepted: boolean;
  job_id?: string;             // Local job/task ID for tracking
  reason?: string;             // If rejected, why
  estimated_completion: string; // ISO timestamp
}
```

### 8.3 Event Bridge (Outbound)

ArqueOps Tube reports events back to the ArqueOps Platform for the activity log:

| Event | Trigger | Data |
|-------|---------|------|
| `video.produced` | Job reaches DONE | channel_id, job_id, video_title, duration |
| `video.uploaded` | Upload to YouTube succeeds | youtube_video_id, channel_id |
| `channel.connected` | OAuth flow completes | channel_id, channel_name |
| `channel.monetized` | Monetization status changes | channel_id, new_status |
| `provider.degraded` | Health check fails | provider_key, error_code |
| `production.failed` | Job reaches FAILED | job_id, step_key, error |

Events are sent via HTTP POST to the ArqueOps Platform webhook endpoint:
```
POST https://platform.arqueops.com/api/webhooks/departments
Authorization: Bearer {department_api_key}
```

---

## 9. Monetization Model — Dark Channels + AdSense

### 9.1 Revenue Model

```
┌───────────────────────────────────────────────────────────────┐
│                    Revenue Flow                               │
│                                                               │
│  Dark Channels ──► YouTube Videos ──► Ad Views ──► AdSense   │
│                                                     Revenue   │
│                                                               │
│  Cost Structure (per video):                                  │
│    Claude API tokens  ~$0.05-0.15                             │
│    Azure TTS          ~$0.02-0.05                             │
│    ImageFX             $0.00 (cookie-based, no API cost)      │
│    FFmpeg render        $0.00 (local compute)                 │
│    YouTube upload       $0.00 (free API)                      │
│    ─────────────────────────────                              │
│    Total per video:   ~$0.07-0.20                             │
│                                                               │
│  Revenue per video (CPM varies by niche):                     │
│    Low CPM niche:    ~$0.50-2.00 per 1K views                │
│    Mid CPM niche:    ~$2.00-8.00 per 1K views                │
│    High CPM niche:   ~$8.00-30.00 per 1K views               │
│                                                               │
│  Break-even: ~100-500 views per video (mid CPM)               │
│                                                               │
│  At 4 videos/day × 30 days = 120 videos/month                │
│    Conservative (1K views/video, $3 CPM):                     │
│      Revenue = 120 × 1 × $3 = $360/month                     │
│      Cost    = 120 × $0.15  = $18/month                      │
│      Profit  = $342/month per channel                         │
│                                                               │
│  Scale: 10 channels × $342 = $3,420/month                    │
└───────────────────────────────────────────────────────────────┘
```

### 9.2 Monetization Tracking

Revenue tracking is handled via the YouTube Analytics API (read-only scope already
in OAuth). The system periodically pulls:
- Estimated revenue per video
- CPM actuals per niche/geography
- Watch time and retention metrics

This data feeds back into niche analysis to optimize channel portfolio allocation.

---

## 10. Boundaries — This Demand vs. Subsequent Demands

### 10.1 This Demand (Foundation)

**IN SCOPE** — what this architecture document defines:
- Module architecture and boundaries
- Data model (all tables, relationships, indexes)
- OAuth flow specification
- Autonomous channel creation process description
- Production scheduler design
- Provider registry + API key vault with encryption
- ArqueOps Platform integration contract
- Technical decisions (encryption algorithm, token management, scheduling approach)

### 10.2 Subsequent Demands

**OUT OF SCOPE** — to be implemented in future demands:

| Demand | Description | Dependencies |
|--------|-------------|-------------|
| **UI: Channel Management** | Admin UI for channels CRUD, OAuth connect button, channel dashboard | This architecture |
| **UI: Production Dashboard** | Real-time production monitoring, job queue, per-channel analytics | This architecture |
| **AI Niche Analyzer** | Claude-powered niche research worker with market data extraction | Channels module |
| **YouTube Upload Step** | Step 13 implementation (Data API v3 resumable upload) | Providers module |
| **AdSense Integration** | Revenue tracking, CPM analysis, monetization status sync | YouTube Analytics API |
| **Production Scheduler Worker** | pg_cron or Next.js cron for automated production triggers | Productions module |
| **Content Calendar Generator** | AI-driven 30-day content planning per channel | Channels + LLM |
| **Provider Health Monitor** | Periodic health checks, auto-failover, alerting | Providers module |
| **Multi-channel Board** | Board view filtered by channel with cross-channel analytics | UI + Channels |

---

## 11. Technical Decisions

### 11.1 ADR-001: AES-256-GCM for API Key Encryption

**Decision**: Use AES-256-GCM (authenticated encryption) for API key storage.

**Why**: GCM provides both confidentiality and integrity verification. The auth tag
prevents tampered ciphertext from decrypting silently. Node.js `crypto` module
supports it natively — no extra dependencies.

**Alternatives considered**:
- Supabase Vault (pgsodium): Tight coupling to Supabase internals, harder to test
  locally, limited documentation
- AWS KMS / GCP Cloud KMS: Adds cloud vendor dependency and latency per decryption
- Plaintext in env vars only: Doesn't scale to per-channel OAuth tokens

### 11.2 ADR-002: Separate Table for OAuth Tokens

**Decision**: Store OAuth tokens in `channel_oauth_tokens` rather than inline in
`youtube_channels`.

**Why**: Tokens are secrets with different lifecycle (refresh, expiry, rotation)
than channel metadata. Separate table enables stricter RLS policies, simpler
audit, and cleaner separation of concerns.

### 11.3 ADR-003: pg_cron + API Route for Scheduling

**Decision**: Use Supabase pg_cron for triggering production checks, with a
Next.js API route (`/api/cron/produce`) as the execution endpoint.

**Why**: pg_cron runs inside Supabase with no extra infra. The API route handles
the actual logic (checking schedules, creating jobs, triggering pipeline). This
avoids long-running database functions and keeps business logic in TypeScript.

**Alternative**: Vercel Cron — viable but adds deployment coupling. pg_cron is
more self-contained within Supabase.

### 11.4 ADR-004: Channel Config Overrides via JSONB

**Decision**: Store channel-specific configuration overrides in
`youtube_channels.config` as JSONB.

**Why**: Each channel may need different voice presets (language), video presets
(shorts vs longform), prompt templates (niche-specific), and knowledge base entries.
JSONB allows flexible per-channel overrides without schema changes. The production
scheduler merges channel config with recipe defaults at runtime.

### 11.5 ADR-005: YouTube Upload as Pipeline Step (Not Separate Worker)

**Decision**: Add YouTube upload as step 13 in the pipeline recipe, not as a
separate post-pipeline worker.

**Why**: Keeps the entire production lifecycle within a single job with unified
state tracking, error handling, and retry logic. The upload step uses the same
manifest-first pattern as other steps, and its artifacts (YouTube video ID, upload
status) are tracked in the same job record.

---

## 12. File Structure (Proposed)

```
src/
├── lib/
│   ├── channels/               ← NEW: Channels module
│   │   ├── types.ts            # Channel, OAuthToken types
│   │   ├── channel-service.ts  # CRUD operations
│   │   ├── oauth.ts            # OAuth flow (authorize, callback, refresh)
│   │   ├── token-manager.ts    # Token lifecycle (refresh, revoke)
│   │   └── youtube-api.ts      # YouTube Data API v3 client
│   │
│   ├── providers/              ← NEW: Provider registry
│   │   ├── types.ts            # Provider, ApiKey types
│   │   ├── vault.ts            # AES-256-GCM encrypt/decrypt
│   │   ├── registry.ts         # Provider CRUD + health
│   │   └── usage-tracker.ts    # Cost/quota tracking
│   │
│   ├── productions/            ← NEW: Production scheduling
│   │   ├── types.ts            # Schedule, ContentCalendar types
│   │   ├── scheduler.ts        # Production schedule logic
│   │   ├── content-calendar.ts # Calendar management
│   │   └── niche-analyzer.ts   # AI niche analysis
│   │
│   ├── integrations/           ← NEW: Platform integration
│   │   ├── platform-api.ts     # ArqueOps Platform connector
│   │   └── event-bridge.ts     # Outbound event publishing
│   │
│   ├── engine/                 ← EXISTING: Production engine
│   │   ├── executors/
│   │   │   ├── upload.ts       # NEW: YouTube upload step
│   │   │   └── ...             # Existing executors
│   │   └── ...                 # Existing engine files
│   │
│   └── ...
│
├── app/
│   └── api/
│       ├── channels/           ← NEW: Channel API routes
│       │   ├── route.ts        # GET (list), POST (create)
│       │   ├── [id]/
│       │   │   └── route.ts    # GET, PATCH, DELETE
│       │   └── oauth/
│       │       ├── authorize/
│       │       │   └── route.ts
│       │       ├── callback/
│       │       │   └── route.ts
│       │       └── revoke/
│       │           └── route.ts
│       │
│       ├── cron/               ← NEW: Cron endpoints
│       │   └── produce/
│       │       └── route.ts    # Production scheduler trigger
│       │
│       ├── platform/           ← NEW: Platform integration
│       │   ├── status/
│       │   │   └── route.ts
│       │   ├── demands/
│       │   │   └── route.ts
│       │   └── report/
│       │       └── route.ts
│       │
│       └── ...                 # Existing API routes
│
└── ...
```

---

## 13. Security Considerations

1. **OAuth tokens**: Encrypted at rest with AES-256-GCM. Never sent to client.
   Refreshed server-side only.

2. **API keys**: Same encryption as OAuth tokens. Decrypted only at execution time.
   `VAULT_MASTER_KEY` stored exclusively in environment variables.

3. **RLS policies**: `channel_oauth_tokens` and `provider_api_keys` tables get
   restrictive RLS — only `service_role` can read encrypted fields. Authenticated
   users can see metadata (key_name, expires_at) but never encrypted values.

4. **PKCE**: OAuth uses S256 code challenge to prevent authorization code
   interception.

5. **State parameter**: Random UUID verified on callback to prevent CSRF.

6. **Scope minimization**: YouTube OAuth requests only the scopes strictly needed.
   No `youtube` (full access) scope — only specific read/upload/analytics scopes.

7. **Token rotation**: Refresh tokens are single-use (Google's policy). Each
   refresh returns a new refresh token, which is re-encrypted and stored.

8. **ImageFX cookies**: Stored encrypted in vault. Auto-expiry detection with
   graceful degradation (skip image step, use fallback).

---

*This document serves as the foundation for all subsequent implementation demands.
Each module boundary is designed to be implementable as an independent demand
without breaking the others.*
