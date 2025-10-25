-- Verificar valores de closing_day nos cartões
SELECT 
  id,
  name,
  bank,
  billing_day,
  closing_day,
  best_day,
  CASE 
    WHEN closing_day IS NULL THEN '⚠️ Precisa definir'
    ELSE '✓ Ok'
  END as status
FROM cards
ORDER BY closing_day NULLS LAST, name;

