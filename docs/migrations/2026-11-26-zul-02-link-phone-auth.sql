-- =============================================================================
-- Phone sign-in (WhatsApp OTP) lands on the user's existing account
-- Date: 2026-11-26
--
-- Three cases, all idempotent and safe to re-run:
--
--   A) User signed up by email and later verified the phone on WhatsApp.
--      -> copy the phone into auth.users, so a phone OTP sign-in finds the same
--         auth user instead of creating a new one (backfill + trigger).
--
--   B) Account created by Zul on WhatsApp (public.users row) but the auth user
--      could not be created at that time (the backend normally creates it with
--      the same id, so this is the rare path).
--      -> when a NEW auth user confirms that phone, the public row is moved to
--         the auth user's id and every reference is re-pointed.
--
--   C) Anything ambiguous (two public rows with the same phone, phone already
--      used by another auth user, ...) is left alone, with a WARNING in the log.
--
-- Nothing here can block a sign-in: trigger bodies swallow errors.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Digit variants of a phone, covering Brazilian mobiles with and without the 9.
CREATE OR REPLACE FUNCTION public.zul_phone_variants(p_phone TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  d TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  out TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF d = '' THEN RETURN out; END IF;
  -- Brazilian local numbers stored without the country code.
  IF length(d) IN (10, 11) AND left(d, 1) <> '0' THEN d := '55' || d; END IF;
  out := ARRAY[d];
  IF left(d, 2) = '55' THEN
    IF length(d) = 13 AND substr(d, 5, 1) = '9' THEN
      out := out || (left(d, 4) || substr(d, 6));          -- without the 9
    ELSIF length(d) = 12 THEN
      out := out || (left(d, 4) || '9' || substr(d, 5));   -- with the 9
    END IF;
  ELSIF left(d, 3) = '521' AND length(d) = 13 THEN
    out := out || ('52' || substr(d, 4));                  -- MX without the legacy 1
  ELSIF left(d, 2) = '52' AND length(d) = 12 THEN
    out := out || ('521' || substr(d, 3));
  ELSIF left(d, 3) = '549' AND length(d) = 13 THEN
    out := out || ('54' || substr(d, 4));                  -- AR mobile without the 9
  ELSIF left(d, 2) = '54' AND length(d) = 12 THEN
    out := out || ('549' || substr(d, 3));
  END IF;
  RETURN out;
END $$;

-- -----------------------------------------------------------------------------
-- Case B: move a public.users row to the id of the auth user that just
-- confirmed the same phone. Returns the user id that is now linked, or NULL.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zul_link_phone_auth_user(p_auth_id UUID, p_phone TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_variants  TEXT[] := public.zul_phone_variants(p_phone);
  v_old       public.users%ROWTYPE;
  v_count     INTEGER;
  v_email     TEXT;
  v_new_cc    UUID[];
  r           RECORD;
BEGIN
  IF p_auth_id IS NULL OR cardinality(v_variants) = 0 OR length(v_variants[1]) < 8 THEN
    RETURN NULL;
  END IF;

  -- Already linked (normal case: Zul created the auth user with the same id).
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_auth_id) THEN
    RETURN p_auth_id;
  END IF;

  -- Exactly one active public user with this phone and no auth user of its own.
  SELECT count(*) INTO v_count
    FROM public.users u
   WHERE COALESCE(u.is_active, TRUE)
     AND regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') <> ''
     AND public.zul_phone_variants(u.phone) && v_variants
     AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id);
  IF v_count <> 1 THEN
    IF v_count > 1 THEN
      RAISE WARNING 'zul_link_phone_auth_user: % candidate users for this phone, not linking', v_count;
    END IF;
    RETURN NULL;
  END IF;

  SELECT u.* INTO v_old
    FROM public.users u
   WHERE COALESCE(u.is_active, TRUE)
     AND regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') <> ''
     AND public.zul_phone_variants(u.phone) && v_variants
     AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id)
   LIMIT 1
   FOR UPDATE;

  v_email := v_old.email;

  -- Free the unique email/phone on the old row, then insert the copy.
  UPDATE public.users
     SET email = 'relink-' || v_old.id::TEXT || '@relink.invalid',
         phone = NULL
   WHERE id = v_old.id;

  INSERT INTO public.users
  SELECT (jsonb_populate_record(NULL::public.users, to_jsonb(v_old) || jsonb_build_object('id', p_auth_id))).*;

  -- An insert trigger may have created a cost center for the new id.
  SELECT array_agg(id) INTO v_new_cc FROM public.cost_centers WHERE user_id = p_auth_id;
  IF v_new_cc IS NOT NULL AND EXISTS (SELECT 1 FROM public.cost_centers WHERE user_id = v_old.id) THEN
    DELETE FROM public.cost_centers WHERE id = ANY (v_new_cc);
  END IF;

  -- Re-point every single-column foreign key that references public.users(id).
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f'
       AND c.confrelid = 'public.users'::regclass
       AND array_length(c.conkey, 1) = 1
       AND c.conrelid <> 'public.users'::regclass
  LOOP
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', r.tbl, r.col, r.col) USING p_auth_id, v_old.id;
  END LOOP;

  -- Also user-id columns that have no FK constraint (UUIDs are unique, so a
  -- match on the old id can only be this user).
  FOR r IN
    SELECT format('%I.%I', col.table_schema, col.table_name) AS tbl, col.column_name AS col
      FROM information_schema.columns col
      JOIN information_schema.tables t
        ON t.table_schema = col.table_schema AND t.table_name = col.table_name AND t.table_type = 'BASE TABLE'
     WHERE col.table_schema = 'public'
       AND col.table_name <> 'users'
       AND col.data_type = 'uuid'
       AND col.column_name IN ('user_id', 'admin_id', 'created_by', 'invited_by', 'updated_by', 'paid_by_user_id')
  LOOP
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', r.tbl, r.col, r.col) USING p_auth_id, v_old.id;
  END LOOP;

  UPDATE public.organizations SET admin_id = p_auth_id WHERE admin_id IS NULL AND id = v_old.organization_id;

  -- RLS helpers read the email from the JWT: give the auth user the row's email
  -- when it has none and nobody else uses it.
  IF v_email IS NOT NULL AND v_email <> '' THEN
    UPDATE auth.users a
       SET email = v_email
     WHERE a.id = p_auth_id
       AND (a.email IS NULL OR a.email = '')
       AND NOT EXISTS (SELECT 1 FROM auth.users o WHERE lower(o.email) = lower(v_email) AND o.id <> p_auth_id);
  END IF;

  DELETE FROM public.users WHERE id = v_old.id;

  RAISE LOG 'zul_link_phone_auth_user: moved user % to auth id %', v_old.id, p_auth_id;
  RETURN p_auth_id;
END $$;

REVOKE ALL ON FUNCTION public.zul_link_phone_auth_user(UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.zul_on_auth_phone_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.phone IS NULL OR NEW.phone = '' OR NEW.phone_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM public.zul_link_phone_auth_user(NEW.id, NEW.phone);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'zul_on_auth_phone_confirmed: % (%)', SQLERRM, SQLSTATE;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zul_link_phone_auth_user ON auth.users;
CREATE TRIGGER zul_link_phone_auth_user
  AFTER INSERT OR UPDATE OF phone_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.zul_on_auth_phone_confirmed();

-- -----------------------------------------------------------------------------
-- Case A: keep auth.users.phone in sync with a verified public.users.phone,
-- when the phone is not used by any other auth user.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zul_sync_auth_phone(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_phone    TEXT;
  v_variants TEXT[];
BEGIN
  SELECT public.zul_phone_variants(u.phone) INTO v_variants
    FROM public.users u
   WHERE u.id = p_user_id AND COALESCE(u.phone_verified, FALSE) AND COALESCE(u.is_active, TRUE);
  IF v_variants IS NULL OR cardinality(v_variants) = 0 THEN RETURN FALSE; END IF;
  v_phone := v_variants[1];

  IF EXISTS (SELECT 1 FROM auth.users o
              WHERE o.id <> p_user_id
                AND o.phone IS NOT NULL AND o.phone <> ''
                AND public.zul_phone_variants(o.phone) && v_variants) THEN
    RETURN FALSE;
  END IF;

  UPDATE auth.users a
     SET phone = v_phone,
         phone_confirmed_at = COALESCE(a.phone_confirmed_at, NOW())
   WHERE a.id = p_user_id
     AND (a.phone IS NULL OR a.phone = '');
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.zul_sync_auth_phone(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.zul_on_user_phone_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF COALESCE(NEW.phone_verified, FALSE) AND NEW.phone IS NOT NULL THEN
    BEGIN
      PERFORM public.zul_sync_auth_phone(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'zul_on_user_phone_verified: % (%)', SQLERRM, SQLSTATE;
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zul_sync_auth_phone ON public.users;
CREATE TRIGGER zul_sync_auth_phone
  AFTER INSERT OR UPDATE OF phone, phone_verified ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.zul_on_user_phone_verified();

COMMIT;

-- -----------------------------------------------------------------------------
-- Backfill for case A (run once, after reviewing the preview).
-- -----------------------------------------------------------------------------
-- Preview: users that would get their phone copied into auth.users
-- SELECT u.id, u.email, u.phone
--   FROM public.users u JOIN auth.users a ON a.id = u.id
--  WHERE COALESCE(u.phone_verified, FALSE) AND COALESCE(u.is_active, TRUE)
--    AND u.phone IS NOT NULL AND (a.phone IS NULL OR a.phone = '');

DO $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT u.id
      FROM public.users u JOIN auth.users a ON a.id = u.id
     WHERE COALESCE(u.phone_verified, FALSE) AND COALESCE(u.is_active, TRUE)
       AND u.phone IS NOT NULL AND (a.phone IS NULL OR a.phone = '')
  LOOP
    BEGIN
      IF public.zul_sync_auth_phone(r.id) THEN n := n + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'backfill skipped %: %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'auth.users phone backfill: % users updated', n;
END $$;
