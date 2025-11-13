-- ============================================================================
-- Função: delete_solo_account
-- Objetivo: Remover completamente uma conta solo (organização + usuário)
-- Obs: Executar com service role (RLS bloqueia anon)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_solo_account(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted JSONB := '{}'::JSONB;
  v_count BIGINT;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id é obrigatório';
  END IF;

  -- 1. Remover splits de despesas vinculados à organização
  DELETE FROM expense_splits
  WHERE expense_id IN (
    SELECT id FROM expenses WHERE organization_id = p_organization_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('expense_splits', v_count);

  -- 2. Remover despesas
  DELETE FROM expenses
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('expenses', v_count);

  -- 3. Remover splits de receitas
  DELETE FROM income_splits
  WHERE income_id IN (
    SELECT id FROM incomes WHERE organization_id = p_organization_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('income_splits', v_count);

  -- 4. Remover receitas
  DELETE FROM incomes
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('incomes', v_count);

  -- 5. Remover contas a pagar
  DELETE FROM bills
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('bills', v_count);

  -- 6. Remover conversas (WhatsApp / Web chat)
  DELETE FROM conversations
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('conversations', v_count);

  -- 7. Remover preferências, tours, notificações e verificações (cascateiam da org, mas já limpamos)
  DELETE FROM user_preferences
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('user_preferences', v_count);

  DELETE FROM notifications
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('notifications', v_count);

  DELETE FROM user_tours
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('user_tours', v_count);

  DELETE FROM onboarding_progress
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('onboarding_progress', v_count);

  -- 8. Remover convites pendentes
  DELETE FROM pending_invites
  WHERE organization_id = p_organization_id
     OR (p_user_id IS NOT NULL AND invited_by = p_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('pending_invites', v_count);

  -- 9. Remover metas de investimento
  DELETE FROM investment_goals
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('investment_goals', v_count);

  -- 10. Remover contas bancárias e transações
  DELETE FROM bank_account_transactions
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('bank_account_transactions', v_count);

  DELETE FROM bank_account_shares
  WHERE bank_account_id IN (
    SELECT id FROM bank_accounts WHERE organization_id = p_organization_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('bank_account_shares', v_count);

  DELETE FROM bank_accounts
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('bank_accounts', v_count);

  -- 11. Remover cost centers após limpar dependências
  DELETE FROM cost_centers
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('cost_centers', v_count);

  -- 12. Remover códigos de verificação do usuário (se informado)
  IF p_user_id IS NOT NULL THEN
    DELETE FROM verification_codes WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('verification_codes', v_count);
  END IF;

  -- 13. Remover usuário(s)
  DELETE FROM users
  WHERE organization_id = p_organization_id
     OR (p_user_id IS NOT NULL AND id = p_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('users', v_count);

  -- 14. Finalmente, remover a organização
  DELETE FROM organizations
  WHERE id = p_organization_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('organizations', v_count);

  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_solo_account(UUID, UUID) TO service_role;


