-- =============================================================================
-- Zul on WhatsApp: state tables for the new stateless core
-- Date: 2026-11-26
--
-- Idempotent: safe to run more than once. Drops nothing.
-- New tables are only touched by the backend with the service role key, so RLS
-- is enabled with no policies (anon/authenticated clients can't read them).
-- =============================================================================

BEGIN;

-- 1) Idempotency: one row per WhatsApp message id (Meta retries webhooks).
CREATE TABLE IF NOT EXISTS public.zul_processed_messages (
  message_id   TEXT PRIMARY KEY,
  phone        TEXT,
  status       TEXT NOT NULL DEFAULT 'processing',  -- processing | done | error | ignored | duplicate
  detail       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS zul_processed_messages_created_at_idx
  ON public.zul_processed_messages (created_at);

-- 2) Conversation state, one row per phone (digits only, E.164 without "+").
CREATE TABLE IF NOT EXISTS public.zul_conversations (
  phone             TEXT PRIMARY KEY,
  user_id           UUID,
  language          TEXT,
  currency          TEXT,
  pending           JSONB,
  last_confirmation JSONB,
  records_count     INTEGER NOT NULL DEFAULT 0,
  quiet             BOOLEAN NOT NULL DEFAULT FALSE,
  intro_sent_at     TIMESTAMPTZ,
  last_seen_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS zul_conversations_user_id_idx
  ON public.zul_conversations (user_id);

-- 3) Confirmations Zul sent, so a reply to any of them can correct or delete.
CREATE TABLE IF NOT EXISTS public.zul_confirmations (
  wa_message_id TEXT PRIMARY KEY,
  phone         TEXT NOT NULL,
  kind          TEXT NOT NULL,            -- expense | income | installments | bill | budget
  record_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS zul_confirmations_phone_created_idx
  ON public.zul_confirmations (phone, created_at DESC);

ALTER TABLE public.zul_processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zul_conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zul_confirmations      ENABLE ROW LEVEL SECURITY;

-- 4) Per-user language and currency (the code falls back if these are missing).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS currency TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_language_check') THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_language_check CHECK (language IS NULL OR language IN ('pt', 'es', 'en'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_currency_check') THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');
  END IF;
END $$;

-- 5) Card closing day (asked once per card for installments).
DO $$
BEGIN
  IF to_regclass('public.cards') IS NOT NULL THEN
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS closing_day INTEGER;
  END IF;
END $$;

COMMIT;

-- Optional housekeeping (run from a cron if you like; not required):
-- DELETE FROM public.zul_processed_messages WHERE created_at < NOW() - INTERVAL '30 days';
-- DELETE FROM public.zul_confirmations      WHERE created_at < NOW() - INTERVAL '90 days';
