-- ============================================
-- AJUSTAR DATAS DAS PARCELAS EXISTENTES
-- ============================================
-- Atualiza todas as parcelas existentes para manter o mesmo dia da compra
-- Exemplo: se comprou dia 05/11, todas as parcelas serão 05/11, 05/12, 05/01, etc.

-- Script para atualizar parcelas existentes
DO $$
DECLARE
    parcel_record RECORD;
    parent_date DATE;
    purchase_day INTEGER;
    purchase_month INTEGER;
    purchase_year INTEGER;
    target_month INTEGER;
    target_year INTEGER;
    new_date DATE;
    parcel_num INTEGER;
BEGIN
    -- Para cada grupo de parcelas (agrupadas por parent_expense_id)
    FOR parcel_record IN 
        SELECT DISTINCT parent_expense_id 
        FROM expenses 
        WHERE parent_expense_id IS NOT NULL 
        AND installment_info IS NOT NULL
        AND payment_method = 'credit_card'
        ORDER BY parent_expense_id
    LOOP
        -- Buscar a primeira parcela (parent) para pegar a data original
        SELECT date, 
               EXTRACT(DAY FROM date)::INTEGER,
               EXTRACT(MONTH FROM date)::INTEGER,
               EXTRACT(YEAR FROM date)::INTEGER,
               (installment_info->>'total_installments')::INTEGER
        INTO parent_date, purchase_day, purchase_month, purchase_year, parcel_num
        FROM expenses 
        WHERE id = parcel_record.parent_expense_id;
        
        -- Se encontrou a parcela pai
        IF parent_date IS NOT NULL THEN
            -- Atualizar todas as parcelas do grupo (incluindo a primeira)
            FOR i IN 1..parcel_num LOOP
                -- Calcular mês e ano da parcela
                target_month := purchase_month + (i - 1);
                target_year := purchase_year;
                
                -- Ajustar ano se necessário
                WHILE target_month > 12 LOOP
                    target_month := target_month - 12;
                    target_year := target_year + 1;
                END LOOP;
                
                -- Calcular nova data (mesmo dia do mês)
                BEGIN
                    new_date := MAKE_DATE(target_year, target_month, purchase_day);
                EXCEPTION WHEN OTHERS THEN
                    -- Se o dia não existe no mês (ex: 31 em fevereiro), usar o último dia do mês
                    new_date := (DATE_TRUNC('month', MAKE_DATE(target_year, target_month, 1)) + INTERVAL '1 month - 1 day')::DATE;
                END;
                
                -- Atualizar a parcela
                -- Parcela 1: id = parent_expense_id (primeira parcela referencia a si mesma)
                -- Parcelas 2+: parent_expense_id = parent_id e current_installment = i
                IF i = 1 THEN
                    UPDATE expenses
                    SET date = new_date
                    WHERE id = parcel_record.parent_expense_id;
                ELSE
                    UPDATE expenses
                    SET date = new_date
                    WHERE parent_expense_id = parcel_record.parent_expense_id 
                      AND (installment_info->>'current_installment')::INTEGER = i;
                END IF;
                
                RAISE NOTICE 'Parcela % atualizada para data: %', i, new_date;
            END LOOP;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Atualização concluída!';
END $$;

-- Verificar resultado
SELECT 
    e1.id as parent_id,
    e1.date as primeira_parcela,
    e1.description,
    (e1.installment_info->>'total_installments')::INTEGER as total_parcelas,
    COUNT(e2.id) as parcelas_criadas,
    STRING_AGG(e2.date::TEXT, ', ' ORDER BY (e2.installment_info->>'current_installment')::INTEGER) as datas_parcelas
FROM expenses e1
LEFT JOIN expenses e2 ON e2.parent_expense_id = e1.id
WHERE e1.installment_info IS NOT NULL 
  AND e1.payment_method = 'credit_card'
  AND e1.parent_expense_id = e1.id
GROUP BY e1.id, e1.date, e1.description, e1.installment_info
ORDER BY e1.date DESC
LIMIT 10;

