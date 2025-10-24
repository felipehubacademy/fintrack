-- Corrigir split da despesa 131 que foi salva incorretamente
UPDATE expenses 
SET split = true 
WHERE id = 131 
  AND owner = 'Compartilhado' 
  AND split = false;

-- Verificar o resultado
SELECT id, description, owner, split, cost_center_id, payment_method
FROM expenses 
WHERE id = 131;
