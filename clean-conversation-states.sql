-- Limpar todos os estados de conversação para forçar uso das novas instruções do Zul
DELETE FROM conversation_state;

-- Verificar resultado
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT user_phone) as usuarios_unicos
FROM conversation_state;
