-- ============================================================================
-- Migration: RLS Policies para Card Invoices
-- Data: 17/11/2025
-- Descrição: Adiciona políticas RLS para as tabelas card_invoices e card_invoice_payments
-- ============================================================================

-- 1. Habilitar RLS nas tabelas -----------------------------------------------
ALTER TABLE card_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_invoice_payments ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para card_invoices -------------------------------------------

-- SELECT: Ver faturas dos cartões da própria organização
DROP POLICY IF EXISTS "Users can view card invoices from their organization" ON card_invoices;
CREATE POLICY "Users can view card invoices from their organization"
ON card_invoices
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- INSERT: Criar faturas para cartões da própria organização
DROP POLICY IF EXISTS "Users can insert card invoices in their organization" ON card_invoices;
CREATE POLICY "Users can insert card invoices in their organization"
ON card_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- UPDATE: Atualizar faturas da própria organização
DROP POLICY IF EXISTS "Users can update card invoices in their organization" ON card_invoices;
CREATE POLICY "Users can update card invoices in their organization"
ON card_invoices
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- DELETE: Deletar faturas da própria organização
DROP POLICY IF EXISTS "Users can delete card invoices in their organization" ON card_invoices;
CREATE POLICY "Users can delete card invoices in their organization"
ON card_invoices
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- 3. Políticas para card_invoice_payments ------------------------------------

-- SELECT: Ver pagamentos de faturas da própria organização
DROP POLICY IF EXISTS "Users can view card invoice payments from their organization" ON card_invoice_payments;
CREATE POLICY "Users can view card invoice payments from their organization"
ON card_invoice_payments
FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT id 
    FROM card_invoices 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
);

-- INSERT: Registrar pagamentos para faturas da própria organização
DROP POLICY IF EXISTS "Users can insert card invoice payments in their organization" ON card_invoice_payments;
CREATE POLICY "Users can insert card invoice payments in their organization"
ON card_invoice_payments
FOR INSERT
TO authenticated
WITH CHECK (
  invoice_id IN (
    SELECT id 
    FROM card_invoices 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
);

-- UPDATE: Atualizar pagamentos da própria organização
DROP POLICY IF EXISTS "Users can update card invoice payments in their organization" ON card_invoice_payments;
CREATE POLICY "Users can update card invoice payments in their organization"
ON card_invoice_payments
FOR UPDATE
TO authenticated
USING (
  invoice_id IN (
    SELECT id 
    FROM card_invoices 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  invoice_id IN (
    SELECT id 
    FROM card_invoices 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
);

-- DELETE: Deletar pagamentos da própria organização
DROP POLICY IF EXISTS "Users can delete card invoice payments in their organization" ON card_invoice_payments;
CREATE POLICY "Users can delete card invoice payments in their organization"
ON card_invoice_payments
FOR DELETE
TO authenticated
USING (
  invoice_id IN (
    SELECT id 
    FROM card_invoices 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
);

-- 4. Comentários --------------------------------------------------------------
COMMENT ON POLICY "Users can view card invoices from their organization" ON card_invoices 
IS 'Permite que usuários vejam faturas dos cartões da sua organização';

COMMENT ON POLICY "Users can insert card invoices in their organization" ON card_invoices 
IS 'Permite que usuários criem faturas para cartões da sua organização';

COMMENT ON POLICY "Users can update card invoices in their organization" ON card_invoices 
IS 'Permite que usuários atualizem faturas da sua organização';

COMMENT ON POLICY "Users can delete card invoices in their organization" ON card_invoices 
IS 'Permite que usuários deletem faturas da sua organização';

