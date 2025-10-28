-- ============================================
-- CORRIGIR FUNÇÃO get_billing_cycle
-- ============================================
-- Usar closing_day (dia de fechamento) ao invés de billing_day (dia de vencimento)
-- para calcular o ciclo correto da fatura

CREATE OR REPLACE FUNCTION get_billing_cycle(card_uuid UUID, reference_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
DECLARE
    card_closing_day INTEGER;
    card_billing_day INTEGER;
    cycle_day INTEGER;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Buscar closing_day e billing_day do cartão
    -- Prioridade: usar closing_day se disponível, senão usar billing_day
    SELECT closing_day, billing_day INTO card_closing_day, card_billing_day
    FROM cards WHERE id = card_uuid;
    
    IF card_closing_day IS NULL AND card_billing_day IS NULL THEN
        RAISE EXCEPTION 'Cartão não encontrado ou sem dia de fechamento/vencimento definido';
    END IF;
    
    -- Usar closing_day se disponível, senão usar billing_day como fallback
    -- O ciclo da fatura é baseado no dia de FECHAMENTO (quando a fatura é gerada)
    cycle_day := COALESCE(card_closing_day, card_billing_day);
    
    -- Calcular início do ciclo: dia do fechamento no mês da data de referência
    start_date := DATE_TRUNC('month', reference_date) + (cycle_day - 1) * INTERVAL '1 day';
    
    -- Se o dia de fechamento já passou no mês atual, o ciclo começou no mês anterior
    IF cycle_day > EXTRACT(DAY FROM reference_date) THEN
        start_date := start_date - INTERVAL '1 month';
    END IF;
    
    -- Data de fim é um dia antes do próximo fechamento
    end_date := start_date + INTERVAL '1 month' - INTERVAL '1 day';
    
    RETURN QUERY SELECT start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- Comentário atualizado
COMMENT ON FUNCTION get_billing_cycle IS 'Calcula o ciclo de faturamento de um cartão baseado no closing_day (dia de fechamento da fatura). Usa billing_day como fallback se closing_day não estiver definido.';
