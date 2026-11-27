-- =============================================================================
-- Billing: 7-day trial, Plus subscription and the trial funnel
-- Date: 2026-11-26
--
-- Model (docs/launch/BILLING.md): the organization is the subscriber. The
-- trial starts when the organization is created and lasts 7 days; Plus comes
-- from RevenueCat (webhook writes plus_until / plus_source).
--
-- Idempotent: safe to run more than once. Drops nothing, deletes no data.
-- Existing organizations get a fresh 7-day trial from the moment this runs
-- (launch backfill); running it again does not extend anyone's trial.
-- =============================================================================

BEGIN;

-- 1) Columns on organizations.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trial_ends_at        TIMESTAMPTZ;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plus_until           TIMESTAMPTZ;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plus_source          TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trial_ending_sent_at TIMESTAMPTZ;  -- day-7 message (fim_teste)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS winback_sent_at      TIMESTAMPTZ;  -- day-8 message (oferta_primeiro_mes)

-- New organizations: trial ends 7 days after creation.
ALTER TABLE public.organizations ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- Launch backfill: existing organizations start their 7 days now.
UPDATE public.organizations
   SET trial_ends_at = NOW() + INTERVAL '7 days'
 WHERE trial_ends_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_plus_source_check') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_plus_source_check
      CHECK (plus_source IS NULL OR plus_source IN ('app_store', 'play_store', 'stripe', 'promotional'));
  END IF;
END $$;

-- 2) Index for the daily funnel job: trials ending around today that still
--    owe a message (api/cron/trial-funnel filters exactly on this).
CREATE INDEX IF NOT EXISTS organizations_trial_funnel_idx
  ON public.organizations (trial_ends_at)
  WHERE trial_ending_sent_at IS NULL OR winback_sent_at IS NULL;

-- 3) Zul's "your trial ends in N days" line is sent once per conversation.
ALTER TABLE public.zul_conversations ADD COLUMN IF NOT EXISTS trial_notice_sent_at TIMESTAMPTZ;

-- 4) Billing columns are written only by the server (service role: RevenueCat
--    webhook, funnel job). Organization admins may update their organization
--    through RLS, so keep them from changing these columns from the app.
CREATE OR REPLACE FUNCTION public.organizations_protect_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.trial_ends_at        := OLD.trial_ends_at;
    NEW.plus_until           := OLD.plus_until;
    NEW.plus_source          := OLD.plus_source;
    NEW.trial_ending_sent_at := OLD.trial_ending_sent_at;
    NEW.winback_sent_at      := OLD.winback_sent_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_protect_billing ON public.organizations;
CREATE TRIGGER organizations_protect_billing
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.organizations_protect_billing();

COMMIT;

-- Check after running:
-- SELECT COUNT(*) FILTER (WHERE trial_ends_at IS NULL) AS missing_trial,
--        MIN(trial_ends_at), MAX(trial_ends_at)
--   FROM public.organizations;
