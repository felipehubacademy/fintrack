-- ============================================================================
-- Migration: Backfill incomes from bank transactions without linkage
-- Date: 25/11/2025
-- Descrição: Cria registros na tabela incomes para toda transação bancária do
--            tipo income_deposit que ainda está sem income_id. Garante que os
--            cartões/ dashboards consigam enxergar as entradas antigas.
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_incomes_from_transactions()
RETURNS TABLE(transaction_id BIGINT, income_id UUID, amount NUMERIC) AS $$
DECLARE
  rec RECORD;
  new_income_id UUID;
  cost_center UUID;
  owner_name TEXT;
BEGIN
  FOR rec IN
    SELECT bat.*, ba.name AS bank_account_name
    FROM bank_account_transactions bat
    LEFT JOIN bank_accounts ba ON ba.id = bat.bank_account_id
    WHERE bat.transaction_type = 'income_deposit'
      AND bat.income_id IS NULL
      AND bat.bank_account_id IS NOT NULL
  LOOP
    -- Tentar associar ao cost center do responsável (mesmo user_id)
    SELECT id
    INTO cost_center
    FROM cost_centers
    WHERE organization_id = rec.organization_id
      AND is_active = true
      AND (user_id = rec.user_id)
    ORDER BY created_at
    LIMIT 1;

    -- Fallback: qualquer cost center ativo da organização (ex: compartilhado)
    IF cost_center IS NULL THEN
      SELECT id
      INTO cost_center
      FROM cost_centers
      WHERE organization_id = rec.organization_id
        AND is_active = true
      ORDER BY created_at
      LIMIT 1;
    END IF;

    -- Determinar nome para coluna owner (se existir)
    IF cost_center IS NOT NULL THEN
      SELECT name INTO owner_name FROM cost_centers WHERE id = cost_center;
    ELSE
      SELECT name INTO owner_name FROM organizations WHERE id = rec.organization_id;
    END IF;

    INSERT INTO incomes (
      description,
      amount,
      date,
      category_id,
      is_shared,
      cost_center_id,
      bank_account_id,
      organization_id,
      user_id,
      status,
      source,
      owner,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(NULLIF(rec.description, ''), 'Entrada bancária'),
      rec.amount,
      rec.date,
      NULL,
      FALSE,
      cost_center,
      rec.bank_account_id,
      rec.organization_id,
      rec.user_id,
      'confirmed',
      'import',
      owner_name,
      COALESCE(rec.created_at, NOW()),
      NOW()
    )
    RETURNING id INTO new_income_id;

    UPDATE bank_account_transactions
    SET income_id = new_income_id
    WHERE id = rec.id;

    transaction_id := rec.id;
    income_id := new_income_id;
    amount := rec.amount;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Executar o backfill
SELECT * FROM backfill_incomes_from_transactions();

-- Limpar função auxiliar (evitar reuso acidental)
DROP FUNCTION IF EXISTS backfill_incomes_from_transactions;

