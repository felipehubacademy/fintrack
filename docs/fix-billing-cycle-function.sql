-- ============================================
-- CORRIGIR FUNÇÃO get_billing_cycle
-- ============================================

-- Lógica correta do ciclo de faturamento:
-- Cartão fecha no dia X, então o ciclo vai do dia (X+1) até o dia X do próximo mês
-- Exemplo: billing_day = 8
--   - Ciclo atual: do dia 9/10 até 8/11 (compra de 09/10 até 08/11 fecha em 8/11)
--   - Próximo ciclo: do dia 9/11 até 8/12 (compra de 09/11 até 08/12 fecha em 8/12)

CREATE OR REPLACE FUNCTION get_billing_cycle(card_uuid UUID, reference_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
DECLARE
    closing_day INTEGER;
    start_date DATE;
    end_date DATE;
    ref_year INTEGER;
    ref_month INTEGER;
    ref_day INTEGER;
BEGIN
    -- Buscar closing_day do cartão (dia de fechamento)
    -- Fallback para billing_day se closing_day não existir
    SELECT COALESCE(cards.closing_day, cards.billing_day) INTO closing_day
    FROM cards WHERE cards.id = card_uuid;
    
    IF closing_day IS NULL THEN
        RAISE EXCEPTION 'Cartão não encontrado';
    END IF;
    
    -- Extrair componentes da data de referência
    ref_year := EXTRACT(YEAR FROM reference_date);
    ref_month := EXTRACT(MONTH FROM reference_date);
    ref_day := EXTRACT(DAY FROM reference_date);
    
    -- Calcular início do ciclo atual baseado no closing_day
    -- Se estamos no dia (closing_day + 1) ou depois, o ciclo começou no mês atual
    -- Se estamos antes do dia (closing_day + 1), o ciclo começou no mês anterior
    
    IF ref_day >= (closing_day + 1) THEN
        -- Ciclo começou neste mês (do dia closing_day+1 até closing_day do próximo mês)
        start_date := DATE_TRUNC('month', reference_date) + closing_day * INTERVAL '1 day';
        end_date := DATE_TRUNC('month', reference_date) + INTERVAL '1 month' + (closing_day - 1) * INTERVAL '1 day';
    ELSE
        -- Ciclo começou no mês anterior
        start_date := DATE_TRUNC('month', reference_date) - INTERVAL '1 month' + closing_day * INTERVAL '1 day';
        end_date := DATE_TRUNC('month', reference_date) + (closing_day - 1) * INTERVAL '1 day';
    END IF;
    
    RETURN QUERY SELECT start_date, end_date;
END;
$$ LANGUAGE plpgsql;

