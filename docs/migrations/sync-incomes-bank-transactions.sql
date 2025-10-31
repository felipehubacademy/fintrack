-- ============================================================================
-- Migration: Sincronizar incomes antigos com transações bancárias
-- Data: 31/10/2025
-- Descrição: Cria transações bancárias para todos os incomes que têm bank_account_id
--            mas não têm transação vinculada na tabela bank_account_transactions
-- ============================================================================

-- Função temporária para sincronizar incomes sem transações
CREATE OR REPLACE FUNCTION sync_incomes_bank_transactions()
RETURNS TABLE(
  income_id UUID,
  account_id UUID,
  amount DECIMAL,
  created_transaction_id BIGINT
) AS $$
DECLARE
  v_income RECORD;
  v_transaction_id BIGINT;
  v_count INTEGER := 0;
BEGIN
  -- Para cada income que tem bank_account_id mas não tem transação vinculada
  FOR v_income IN
    SELECT 
      i.id,
      i.bank_account_id,
      i.amount,
      i.description,
      i.date,
      i.organization_id,
      i.user_id
    FROM incomes i
    WHERE i.bank_account_id IS NOT NULL
      AND i.status = 'confirmed'
      AND NOT EXISTS (
        SELECT 1 
        FROM bank_account_transactions bat 
        WHERE bat.income_id = i.id
      )
    ORDER BY i.date ASC
  LOOP
    BEGIN
      -- Criar transação bancária usando a função RPC existente
      SELECT create_bank_transaction(
        p_bank_account_id := v_income.bank_account_id,
        p_transaction_type := 'income_deposit',
        p_amount := v_income.amount,
        p_description := v_income.description,
        p_date := v_income.date,
        p_organization_id := v_income.organization_id,
        p_user_id := v_income.user_id,
        p_expense_id := NULL,
        p_bill_id := NULL,
        p_income_id := v_income.id,
        p_related_account_id := NULL
      ) INTO v_transaction_id;
      
      -- Retornar resultado
      income_id := v_income.id;
      account_id := v_income.bank_account_id;
      amount := v_income.amount;
      created_transaction_id := v_transaction_id;
      RETURN NEXT;
      
      v_count := v_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Logar erro mas continuar processando
      RAISE WARNING 'Erro ao criar transação para income %: %', v_income.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Sincronização concluída: % transações criadas', v_count;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Função para recalcular saldo de uma conta específica ou todas as contas
CREATE OR REPLACE FUNCTION recalculate_all_bank_balances()
RETURNS TABLE(
  account_id UUID,
  account_name TEXT,
  old_balance DECIMAL,
  new_balance DECIMAL
) AS $$
DECLARE
  v_account RECORD;
  v_calculated_balance DECIMAL(10,2);
BEGIN
  -- Para cada conta bancária ativa
  FOR v_account IN
    SELECT id, name, current_balance
    FROM bank_accounts
    WHERE is_active = true
    ORDER BY name
  LOOP
    -- Recalcular saldo baseado em todas as transações
    SELECT COALESCE(
      (SELECT initial_balance FROM bank_accounts WHERE id = v_account.id), 0
    ) + COALESCE(
      (SELECT SUM(
        CASE 
          WHEN transaction_type IN ('manual_credit', 'income_deposit', 'transfer_in') THEN amount
          WHEN transaction_type IN ('manual_debit', 'expense_payment', 'bill_payment', 'transfer_out') THEN -amount
          ELSE 0
        END
      ) FROM bank_account_transactions WHERE bank_account_id = v_account.id), 0
    )
    INTO v_calculated_balance;
    
    -- Atualizar saldo na conta
    UPDATE bank_accounts
    SET current_balance = v_calculated_balance,
        updated_at = NOW()
    WHERE id = v_account.id;
    
    -- Retornar resultado
    account_id := v_account.id;
    account_name := v_account.name;
    old_balance := v_account.current_balance;
    new_balance := v_calculated_balance;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Executar sincronização de incomes
SELECT * FROM sync_incomes_bank_transactions();

-- Recalcular todos os saldos após sincronização
SELECT * FROM recalculate_all_bank_balances();

-- Comentários de documentação
COMMENT ON FUNCTION sync_incomes_bank_transactions IS 
'Função para sincronizar incomes antigos que têm bank_account_id mas não têm transação bancária vinculada. 
Retorna informações sobre as transações criadas.';

COMMENT ON FUNCTION recalculate_all_bank_balances IS 
'Função para recalcular todos os saldos das contas bancárias baseado nas transações existentes.
Útil para corrigir inconsistências nos saldos.';

