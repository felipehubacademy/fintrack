-- ============================================================================
-- Migration: Correção do trigger de sincronização de faturas
-- Data: 22/11/2025
-- Descrição:
--   1. Adiciona SECURITY DEFINER à função sync_card_invoice para bypass RLS
--   2. Corrige o trigger para retornar OLD quando DELETE
--   3. Não afeta as mudanças de edição de parcelas implementadas ontem
-- ============================================================================

-- ============================================================================
-- 1. RECRIAR FUNÇÃO sync_card_invoice COM SECURITY DEFINER
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
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ← SECURITY DEFINER adicionado para bypass RLS

COMMENT ON FUNCTION sync_card_invoice(UUID, DATE, UUID, UUID)
IS 'Sincroniza card_invoices ao adicionar/atualizar despesas de cartão (com SECURITY DEFINER para triggers)';

-- ============================================================================
-- 2. RECRIAR TRIGGER COM CORREÇÃO DE RETURN
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_sync_card_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for DELETE, processar antes de retornar
  IF TG_OP = 'DELETE' THEN
    IF OLD.payment_method = 'credit_card' AND OLD.card_id IS NOT NULL AND OLD.status = 'confirmed' THEN
      PERFORM sync_card_invoice(
        OLD.card_id,
        OLD.date,
        OLD.organization_id,
        OLD.user_id
      );
    END IF;
    RETURN OLD;  -- ← IMPORTANTE: Retornar OLD em DELETE
  END IF;
  
  -- Se for INSERT ou UPDATE
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS sync_card_invoice_trigger ON expenses;
CREATE TRIGGER sync_card_invoice_trigger
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_card_invoice();

COMMENT ON TRIGGER sync_card_invoice_trigger ON expenses
IS 'Sincroniza card_invoices automaticamente ao modificar despesas de cartão (corrigido para DELETE)';

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION sync_card_invoice TO authenticated;

-- ============================================================================
-- 4. VERIFICAÇÃO
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Função sync_card_invoice atualizada com SECURITY DEFINER';
  RAISE NOTICE '✅ Trigger corrigido para retornar OLD em DELETE';
  RAISE NOTICE '✅ Correção aplicada sem afetar funcionalidades de edição';
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

