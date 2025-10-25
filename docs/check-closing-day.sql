-- Verificar se closing_day existe na tabela cards
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cards' 
  AND column_name IN ('closing_day', 'billing_day', 'best_day')
ORDER BY column_name;

