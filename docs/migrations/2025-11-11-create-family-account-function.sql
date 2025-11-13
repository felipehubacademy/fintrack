-- ============================================================================
-- Função: create_family_account
-- Objetivo: Criar conta familiar (organização + usuário admin + cost center)
-- Obs: Executar com service role (RLS bloqueia anon)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_family_account(
  p_org_id UUID,
  p_org_name TEXT,
  p_admin_id UUID,
  p_admin_email TEXT,
  p_admin_name TEXT,
  p_admin_phone TEXT,
  p_invite_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organizations%ROWTYPE;
  v_user users%ROWTYPE;
  v_cost_center cost_centers%ROWTYPE;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id é obrigatório';
  END IF;

  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id é obrigatório';
  END IF;

  IF p_org_name IS NULL OR length(trim(p_org_name)) = 0 THEN
    RAISE EXCEPTION 'Nome da organização é obrigatório';
  END IF;

  IF p_admin_email IS NULL OR length(trim(p_admin_email)) = 0 THEN
    RAISE EXCEPTION 'Email do admin é obrigatório';
  END IF;

  IF p_admin_name IS NULL OR length(trim(p_admin_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do admin é obrigatório';
  END IF;

  -- Garante código de convite
  IF p_invite_code IS NULL THEN
    p_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;

  INSERT INTO organizations (
    id,
    name,
    admin_id,
    email,
    invite_code,
    type
  ) VALUES (
    p_org_id,
    trim(p_org_name),
    p_admin_id,
    trim(p_admin_email),
    upper(p_invite_code),
    'family'
  )
  RETURNING * INTO v_org;

  INSERT INTO users (
    id,
    organization_id,
    name,
    email,
    phone,
    role,
    is_active
  ) VALUES (
    p_admin_id,
    p_org_id,
    trim(p_admin_name),
    trim(p_admin_email),
    NULLIF(trim(p_admin_phone), ''),
    'admin',
    true
  )
  RETURNING * INTO v_user;

  INSERT INTO cost_centers (
    id,
    organization_id,
    name,
    default_split_percentage,
    color,
    user_id,
    is_active
  ) VALUES (
    gen_random_uuid(),
    p_org_id,
    trim(p_admin_name),
    100.00,
    '#3B82F6',
    p_admin_id,
    true
  )
  RETURNING * INTO v_cost_center;

  RETURN jsonb_build_object(
    'success', true,
    'organization', to_jsonb(v_org),
    'user', to_jsonb(v_user),
    'cost_center', to_jsonb(v_cost_center)
  );

EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Violação de unicidade, revertendo criação da organização %', p_org_id;
    PERFORM delete_account(p_org_id, p_admin_id);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_family_account(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;


