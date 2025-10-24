const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyInstallmentsFix() {
  console.log('🔧 Aplicando correção da função create_installments...');
  
  try {
    // Aplicar a função SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        DROP FUNCTION IF EXISTS create_installments(numeric,integer,text,date,uuid,uuid,uuid,text,uuid,uuid,text);

        CREATE OR REPLACE FUNCTION create_installments(
            p_amount DECIMAL,
            p_installments INTEGER,
            p_description TEXT,
            p_date DATE,
            p_card_id UUID,
            p_category_id UUID,
            p_cost_center_id UUID,
            p_owner TEXT,
            p_organization_id UUID,
            p_user_id UUID,
            p_whatsapp_message_id TEXT DEFAULT NULL
        ) RETURNS UUID AS $$
        DECLARE
            parent_id UUID;
            installment_amount DECIMAL(10,2);
            installment_date DATE;
            i INTEGER;
            is_shared BOOLEAN;
        BEGIN
            is_shared := (p_cost_center_id IS NULL AND LOWER(p_owner) = 'compartilhado');
            installment_amount := ROUND(p_amount / p_installments, 2);
            
            INSERT INTO expenses (
                amount, description, date, payment_method, card_id,
                category_id, cost_center_id, owner, organization_id, user_id,
                whatsapp_message_id, installment_info, parent_expense_id, split,
                status, confirmed_at, confirmed_by, source
            ) VALUES (
                installment_amount, p_description, p_date, 'credit_card', p_card_id,
                p_category_id, p_cost_center_id, p_owner, p_organization_id, p_user_id,
                p_whatsapp_message_id,
                jsonb_build_object(
                    'total_installments', p_installments,
                    'current_installment', 1,
                    'installment_amount', installment_amount,
                    'total_amount', p_amount
                ),
                NULL,
                is_shared,
                'confirmed',
                NOW(),
                p_user_id,
                'manual'
            ) RETURNING id INTO parent_id;
            
            UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
            
            IF p_installments > 1 THEN
                FOR i IN 2..p_installments LOOP
                    installment_date := p_date + (i - 1) * INTERVAL '1 month';
                    
                    INSERT INTO expenses (
                        amount, description, date, payment_method, card_id,
                        category_id, cost_center_id, owner, organization_id, user_id,
                        installment_info, parent_expense_id, status, split, source
                    ) VALUES (
                        installment_amount, p_description, installment_date, 'credit_card', p_card_id,
                        p_category_id, p_cost_center_id, p_owner, p_organization_id, p_user_id,
                        jsonb_build_object(
                            'total_installments', p_installments,
                            'current_installment', i,
                            'installment_amount', installment_amount,
                            'total_amount', p_amount
                        ),
                        parent_id,
                        'pending',
                        is_shared,
                        'manual'
                    );
                END LOOP;
            END IF;
            
            RETURN parent_id;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('❌ Erro ao aplicar função:', error);
      return;
    }

    console.log('✅ Função create_installments atualizada com sucesso!');

    // Corrigir a despesa 131
    console.log('🔧 Corrigindo despesa 131...');
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ split: true })
      .eq('id', 131)
      .eq('owner', 'Compartilhado');

    if (updateError) {
      console.error('❌ Erro ao corrigir despesa 131:', updateError);
    } else {
      console.log('✅ Despesa 131 corrigida!');
    }

    // Verificar resultado
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, description, owner, split, cost_center_id')
      .eq('id', 131)
      .single();

    if (fetchError) {
      console.error('❌ Erro ao verificar despesa:', fetchError);
    } else {
      console.log('✅ Despesa verificada:', expense);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applyInstallmentsFix();
