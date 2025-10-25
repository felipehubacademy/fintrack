-- Verificar billing_day de todos os cartões
SELECT 
  id,
  name,
  bank,
  billing_day,
  CASE 
    WHEN billing_day IS NULL THEN 'Não definido'
    ELSE 'Ok'
  END as status
FROM cards
ORDER BY billing_day NULLS LAST;

