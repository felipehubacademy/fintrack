-- ============================================================================
-- Migration: Refatoração completa do sistema de faturas de cartão
-- Data: 18/11/2025
-- Descrição:
--   1. Cria função para sincronizar card_invoices ao adicionar/remover despesas
--   2. Cria trigger para manter card_invoices atualizada automaticamente
--   3. Refatora cálculo de limite disponível para considerar faturas pagas
--   4. Atualiza create_bulk_card_expenses para usar novo sistema
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: Sincronizar fatura (criar/atualizar card_invoices)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_card_invoice(
  p_card_id UUID,
  p_expense_date DATE,
  p_organization_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_cycle RECORD;
  v_invoice_id UUID;
  v_total_amount NUMERIC(14,2);
BEGIN
  -- Buscar o ciclo da despesa
  SELECT * INTO v_cycle
  FROM get_billing_cycle(p_card_id, p_expense_date);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível determinar o ciclo de faturamento para a data %', p_expense_date;
  END IF;
  
  -- Calcular o total de despesas confirmadas neste ciclo
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_amount
  FROM expenses
  WHERE card_id = p_card_id
    AND payment_method = 'credit_card'
    AND status = 'confirmed'
    AND date >= v_cycle.start_date
    AND date <= v_cycle.end_date
    AND pending_next_invoice = false; -- Não contar despesas fantasma de rollover
  
  -- Inserir ou atualizar card_invoices
  INSERT INTO card_invoices (
    card_id,
    cycle_start_date,
    cycle_end_date,
    total_amount,
    paid_amount,
    status,
    organization_id,
    user_id,
    created_at,
    updated_at
  )
  VALUES (
    p_card_id,
    v_cycle.start_date,
    v_cycle.end_date,
    v_total_amount,
    0,
    'pending',
    p_organization_id,
    p_user_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (card_id, cycle_start_date)
  DO UPDATE SET
    total_amount = v_total_amount,
    updated_at = NOW()
  RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_card_invoice(UUID, DATE, UUID, UUID)
IS 'Sincroniza card_invoices ao adicionar/atualizar despesas de cartão';

-- ============================================================================
-- 2. TRIGGER: Sincronizar card_invoices automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_sync_card_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas para despesas de cartão de crédito confirmadas
  IF NEW.payment_method = 'credit_card' AND NEW.card_id IS NOT NULL AND NEW.status = 'confirmed' THEN
    PERFORM sync_card_invoice(
      NEW.card_id,
      NEW.date,
      NEW.organization_id,
      NEW.user_id
    );
  END IF;
  
  -- Se for UPDATE e mudou de ciclo ou foi cancelada, sincronizar ambos os ciclos
  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_method = 'credit_card' AND OLD.card_id IS NOT NULL THEN
      IF OLD.date != NEW.date OR OLD.status != NEW.status THEN
        PERFORM sync_card_invoice(
          OLD.card_id,
          OLD.date,
          OLD.organization_id,
          OLD.user_id
        );
      END IF;
    END IF;
  END IF;
  
  -- Se for DELETE, sincronizar o ciclo da despesa removida
  IF TG_OP = 'DELETE' THEN
    IF OLD.payment_method = 'credit_card' AND OLD.card_id IS NOT NULL AND OLD.status = 'confirmed' THEN
      PERFORM sync_card_invoice(
        OLD.card_id,
        OLD.date,
        OLD.organization_id,
        OLD.user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS sync_card_invoice_trigger ON expenses;
CREATE TRIGGER sync_card_invoice_trigger
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_card_invoice();

COMMENT ON TRIGGER sync_card_invoice_trigger ON expenses
IS 'Sincroniza card_invoices automaticamente ao modificar despesas de cartão';

-- ============================================================================
-- 3. FUNÇÃO: Recalcular limite disponível (V2 - considera faturas pagas)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_card_available_limit_v2(p_card_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_credit_limit NUMERIC(14,2);
  v_used_amount NUMERIC(14,2);
BEGIN
  -- Buscar limite do cartão
  SELECT credit_limit
  INTO v_credit_limit
  FROM cards
  WHERE id = p_card_id;

  IF v_credit_limit IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calcular valor usado: despesas confirmadas - valor já pago das faturas
  -- Lógica: Soma todas as despesas confirmadas e subtrai o que já foi pago
  WITH total_expenses AS (
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE card_id = p_card_id
      AND payment_method = 'credit_card'
      AND status = 'confirmed'
      AND pending_next_invoice = false
  ),
  total_paid AS (
    SELECT COALESCE(SUM(paid_amount), 0) as total
    FROM card_invoices
    WHERE card_id = p_card_id
  )
  SELECT (te.total - tp.total)
  INTO v_used_amount
  FROM total_expenses te, total_paid tp;

  RETURN GREATEST(0, COALESCE(v_credit_limit, 0) - v_used_amount);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_card_available_limit_v2(UUID)
IS 'Calcula limite disponível excluindo despesas de faturas pagas (V2)';

-- ============================================================================
-- 4. ATUALIZAR: create_bulk_card_expenses para usar novo sistema
-- ============================================================================
CREATE OR REPLACE FUNCTION create_bulk_card_expenses(
  p_card_id UUID,
  p_organization_id UUID,
  p_user_id UUID,
  p_transactions JSONB
)
RETURNS JSON AS $$
DECLARE
  transaction_item JSONB;
  idx INTEGER := 0;
  parent_id BIGINT;
  parent_ids BIGINT[] := '{}';
  total_value NUMERIC := 0;
  owner_for_rpc TEXT;
  responsibility_name TEXT;
  cost_center_id UUID;
  is_shared BOOLEAN;
  description TEXT;
  transaction_date DATE;
  category_id UUID;
  installments INTEGER;
  amount NUMERIC;
  is_partial_payment BOOLEAN;
  v_invoice_id UUID;
BEGIN
  -- Validações iniciais
  IF p_card_id IS NULL THEN
    RAISE EXCEPTION 'card_id é obrigatório';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id é obrigatório';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  IF p_transactions IS NULL OR jsonb_array_length(p_transactions) = 0 THEN
    RAISE EXCEPTION 'transactions não pode ser vazio';
  END IF;

  -- Processar cada transação
  FOR transaction_item IN SELECT jsonb_array_elements(p_transactions)
  LOOP
    idx := idx + 1;

    description := COALESCE(trim(transaction_item->>'description'), '');
    transaction_date := (transaction_item->>'date')::DATE;
    category_id := (transaction_item->>'category_id')::UUID;
    installments := COALESCE((transaction_item->>'installments')::INTEGER, 1);
    amount := COALESCE((transaction_item->>'amount')::NUMERIC, 0);
    is_shared := COALESCE((transaction_item->>'is_shared')::BOOLEAN, false);
    responsibility_name := COALESCE(trim(transaction_item->>'owner_name'), '');
    cost_center_id := (transaction_item->>'cost_center_id')::UUID;
    is_partial_payment := COALESCE((transaction_item->>'is_partial_payment')::BOOLEAN, false);

    -- Validações
    IF description = '' THEN
      RAISE EXCEPTION 'Descrição é obrigatória na linha %', idx;
    END IF;

    IF transaction_date IS NULL THEN
      RAISE EXCEPTION 'Data é obrigatória na linha %', idx;
    END IF;

    IF category_id IS NULL AND NOT is_partial_payment THEN
      RAISE EXCEPTION 'Categoria é obrigatória na linha %', idx;
    END IF;

    IF amount = 0 AND NOT is_partial_payment THEN
      RAISE EXCEPTION 'Valor não pode ser zero para transações normais na linha %', idx;
    END IF;

    IF amount > 0 AND is_partial_payment THEN
      RAISE EXCEPTION 'Pagamentos parciais devem ter valor negativo na linha %', idx;
    END IF;

    IF installments < 1 OR installments > 120 THEN
      RAISE EXCEPTION 'Parcelas deve estar entre 1 e 120 na linha %', idx;
    END IF;

    -- Determinar owner
    IF is_shared THEN
      owner_for_rpc := 'Compartilhado';
      cost_center_id := NULL;
    ELSE
      IF responsibility_name = '' AND NOT is_partial_payment THEN
        RAISE EXCEPTION 'Responsabilidade é obrigatória na linha %', idx;
      END IF;
      owner_for_rpc := responsibility_name;
    END IF;

    -- Criar despesa(s) usando create_installments
    parent_id := create_installments(
      amount,
      installments,
      description,
      transaction_date,
      p_card_id,
      category_id,
      cost_center_id,
      owner_for_rpc,
      p_organization_id,
      p_user_id,
      NULL::text,
      NULL::jsonb,
      is_partial_payment
    );

    -- Se for compartilhada, atualizar owner
    IF is_shared THEN
      UPDATE expenses
      SET owner = responsibility_name,
          is_shared = true
      WHERE id = parent_id
         OR parent_expense_id = parent_id;
    END IF;

    -- Sincronizar card_invoices para esta despesa
    v_invoice_id := sync_card_invoice(
      p_card_id,
      transaction_date,
      p_organization_id,
      p_user_id
    );

    parent_ids := array_append(parent_ids, parent_id);
    total_value := total_value + amount;
  END LOOP;

  -- Recalcular limite disponível usando nova função
  UPDATE cards
  SET available_limit = calculate_card_available_limit_v2(p_card_id),
      updated_at = NOW()
  WHERE id = p_card_id;

  RETURN json_build_object(
    'inserted', idx,
    'parent_expense_ids', parent_ids,
    'total_amount', total_value
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_bulk_card_expenses(UUID, UUID, UUID, JSONB)
IS 'Cria despesas em massa e sincroniza card_invoices automaticamente';

-- ============================================================================
-- 5. POPULAR card_invoices com dados existentes
-- ============================================================================
-- Sincronizar todas as despesas de cartão existentes
DO $$
DECLARE
  expense_record RECORD;
BEGIN
  FOR expense_record IN 
    SELECT DISTINCT 
      card_id, 
      date, 
      organization_id, 
      user_id
    FROM expenses
    WHERE payment_method = 'credit_card'
      AND card_id IS NOT NULL
      AND status = 'confirmed'
    ORDER BY date
  LOOP
    PERFORM sync_card_invoice(
      expense_record.card_id,
      expense_record.date,
      expense_record.organization_id,
      expense_record.user_id
    );
  END LOOP;
  
  RAISE NOTICE 'card_invoices sincronizada com sucesso!';
END $$;

-- ============================================================================
-- 6. ATUALIZAR available_limit de todos os cartões
-- ============================================================================
UPDATE cards
SET available_limit = calculate_card_available_limit_v2(id),
    updated_at = NOW()
WHERE type = 'credit';

-- ============================================================================
-- 7. CRIAR VIEW para facilitar consultas de faturas
-- ============================================================================
CREATE OR REPLACE VIEW v_card_invoices_detailed AS
SELECT 
  ci.id as invoice_id,
  ci.card_id,
  c.name as card_name,
  c.closing_day,
  c.billing_day,
  ci.cycle_start_date,
  ci.cycle_end_date,
  ci.total_amount,
  ci.paid_amount,
  ci.status,
  ci.first_payment_at,
  ci.fully_paid_at,
  ci.organization_id,
  ci.user_id,
  ci.created_at,
  ci.updated_at,
  -- Calcular data de fechamento (end_date + 1)
  ci.cycle_end_date + INTERVAL '1 day' as closing_date,
  -- Calcular data de vencimento
  CASE 
    WHEN c.billing_day < EXTRACT(DAY FROM (ci.cycle_end_date + INTERVAL '1 day'))
    THEN DATE(DATE_TRUNC('month', ci.cycle_end_date + INTERVAL '1 day') + INTERVAL '1 month' + (c.billing_day - 1 || ' days')::INTERVAL)
    ELSE DATE(DATE_TRUNC('month', ci.cycle_end_date + INTERVAL '1 day') + (c.billing_day - 1 || ' days')::INTERVAL)
  END as due_date,
  -- Contar transações
  (
    SELECT COUNT(*)
    FROM expenses e
    WHERE e.card_id = ci.card_id
      AND e.payment_method = 'credit_card'
      AND e.status = 'confirmed'
      AND e.date >= ci.cycle_start_date
      AND e.date <= ci.cycle_end_date
      AND e.pending_next_invoice = false
  ) as transaction_count
FROM card_invoices ci
INNER JOIN cards c ON c.id = ci.card_id
ORDER BY ci.cycle_start_date DESC;

COMMENT ON VIEW v_card_invoices_detailed
IS 'View com detalhes completos das faturas de cartão incluindo datas calculadas';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

