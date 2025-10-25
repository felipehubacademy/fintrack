-- Testar a função get_billing_cycle para o cartão Latam
-- Feche no dia 8, então ciclo deve ser do dia 9 até dia 8 do próximo mês

SELECT 
  get_billing_cycle('c2a5c5b1-69c1-47bf-a303-add3c872e09a'::UUID, '2025-10-24'::DATE);

-- Deve retornar:
-- start_date: 2025-10-09
-- end_date: 2025-11-08

