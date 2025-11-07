-- Query para identificar despesas sem método de pagamento ou com método desconhecido
-- Execute no Supabase SQL Editor

-- 1. Verificar despesas sem método de pagamento (NULL)
SELECT 
  id,
  description,
  amount,
  payment_method,
  date,
  status,
  organization_id
FROM expenses
WHERE 
  status = 'confirmed'
  AND (
    payment_method IS NULL 
    OR payment_method NOT IN (
      'credit_card',
      'cash',
      'debit_card',
      'pix',
      'bank_transfer',
      'boleto',
      'other'
    )
  )
ORDER BY date DESC;

-- 2. Verificar total de despesas sem método
SELECT 
  COUNT(*) as quantidade,
  SUM(amount) as total_sem_metodo
FROM expenses
WHERE 
  status = 'confirmed'
  AND (
    payment_method IS NULL 
    OR payment_method NOT IN (
      'credit_card',
      'cash',
      'debit_card',
      'pix',
      'bank_transfer',
      'boleto',
      'other'
    )
  );

-- 3. Verificar distribuição de métodos de pagamento
SELECT 
  payment_method,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE status = 'confirmed'
GROUP BY payment_method
ORDER BY total DESC;

-- 4. Comparar total geral vs total filtrado (para um mês específico)
-- Substitua '2025-11' pelo mês que você quer verificar
SELECT 
  'Total Geral' as tipo,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE 
  status = 'confirmed'
  AND date >= '2025-11-01'
  AND date <= '2025-11-30'
UNION ALL
SELECT 
  'Total Filtrado (métodos conhecidos)' as tipo,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE 
  status = 'confirmed'
  AND date >= '2025-11-01'
  AND date <= '2025-11-30'
  AND payment_method IN (
    'credit_card',
    'cash',
    'debit_card',
    'pix',
    'bank_transfer',
    'boleto',
    'other'
  );

-- 5. Verificar total geral SEM filtro de mês (todas as despesas confirmadas)
SELECT 
  'Total Geral (TODOS os meses)' as tipo,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE status = 'confirmed';

-- 6. Verificar despesas por mês para identificar onde está a diferença
SELECT 
  DATE_TRUNC('month', date::date) as mes,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE status = 'confirmed'
GROUP BY DATE_TRUNC('month', date::date)
ORDER BY mes DESC
LIMIT 12;

-- 7. Verificar se há despesas sem organization_id ou com organization_id diferente
-- (pode estar incluindo despesas de outras organizações)
SELECT 
  organization_id,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE status = 'confirmed'
GROUP BY organization_id
ORDER BY total DESC;

-- 8. Verificar total para uma organização específica (substitua pelo seu organization_id)
-- Execute primeiro a query 7 para pegar seu organization_id
SELECT 
  'Total Geral (com organization_id)' as tipo,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE 
  status = 'confirmed'
  AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f' -- Substitua pelo seu organization_id
UNION ALL
SELECT 
  'Total Novembro (com organization_id)' as tipo,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM expenses
WHERE 
  status = 'confirmed'
  AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f' -- Substitua pelo seu organization_id
  AND date >= '2025-11-01'
  AND date <= '2025-11-30';

-- 9. Verificar despesas compartilhadas e seus splits (pode estar duplicando valores)
SELECT 
  e.id,
  e.description,
  e.amount as expense_amount,
  e.is_shared,
  e.owner,
  COUNT(es.id) as splits_count,
  SUM(es.amount) as total_splits_amount,
  CASE 
    WHEN e.amount != SUM(es.amount) THEN 'DIFERENTE'
    ELSE 'OK'
  END as status
FROM expenses e
LEFT JOIN expense_splits es ON e.id = es.expense_id
WHERE 
  e.status = 'confirmed'
  AND e.organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f' -- Substitua pelo seu organization_id
  AND (e.is_shared = true OR es.id IS NOT NULL)
GROUP BY e.id, e.description, e.amount, e.is_shared, e.owner
HAVING e.amount != SUM(es.amount) OR COUNT(es.id) > 0
ORDER BY e.date DESC
LIMIT 20;

-- 10. Ver detalhes dos splits da despesa "Lava-louça" (id 139)
SELECT 
  es.id as split_id,
  es.expense_id,
  es.cost_center_id,
  cc.name as cost_center_name,
  es.percentage,
  es.amount as split_amount,
  e.amount as expense_amount,
  e.description
FROM expense_splits es
JOIN expenses e ON es.expense_id = e.id
LEFT JOIN cost_centers cc ON es.cost_center_id = cc.id
WHERE es.expense_id = 139
ORDER BY es.id;

-- 11. Verificar se há splits duplicados ou com valores incorretos
SELECT 
  es.expense_id,
  e.description,
  e.amount as expense_amount,
  COUNT(es.id) as splits_count,
  SUM(es.amount) as total_splits,
  SUM(es.percentage) as total_percentage,
  CASE 
    WHEN ABS(e.amount - SUM(es.amount)) > 0.01 THEN 'VALOR DIFERENTE'
    WHEN ABS(100 - SUM(es.percentage)) > 0.01 THEN 'PERCENTUAL DIFERENTE'
    ELSE 'OK'
  END as status
FROM expense_splits es
JOIN expenses e ON es.expense_id = e.id
WHERE 
  e.status = 'confirmed'
  AND e.organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f'
GROUP BY es.expense_id, e.description, e.amount
HAVING 
  ABS(e.amount - SUM(es.amount)) > 0.01 
  OR ABS(100 - SUM(es.percentage)) > 0.01
ORDER BY ABS(e.amount - SUM(es.amount)) DESC;

-- 12. CORRIGIR: Deletar splits incorretos da despesa "Lava-louça" (id 139)
-- CUIDADO: Execute apenas se tiver certeza!
-- DELETE FROM expense_splits WHERE expense_id = 139;
-- Depois recrie os splits corretos manualmente ou via interface

