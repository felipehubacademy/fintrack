import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function applySchema() {
  try {
    console.log('🚀 Aplicando schema V2 no Supabase...');
    
    // 1. Ler arquivo de schema simplificado
    const schemaContent = fs.readFileSync('./backend/schema_v2_simple.sql', 'utf8');
    
    // 2. Aplicar schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: schemaContent
    });
    
    if (error) {
      console.error('❌ Erro ao aplicar schema:', error);
      return;
    }
    
    console.log('✅ Schema V2 aplicado com sucesso!');
    
    // 3. Aplicar funções e triggers separadamente
    console.log('🔧 Aplicando funções e triggers...');
    
    const functionsContent = `
-- Função para gerar código de convite único
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    code VARCHAR(8);
    exists_count INTEGER;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 8));
        SELECT COUNT(*) INTO exists_count FROM organizations WHERE invite_code = code;
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Função para validar limite de centros de custo (máximo 5)
CREATE OR REPLACE FUNCTION validate_cost_centers_limit()
RETURNS TRIGGER AS $$
DECLARE
    center_count INTEGER;
BEGIN
    -- Contar centros de custo ativos da organização
    SELECT COUNT(*) INTO center_count 
    FROM cost_centers 
    WHERE organization_id = NEW.organization_id 
    AND is_active = true;
    
    -- Se for update, não contar o próprio registro
    IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
        center_count := center_count - 1;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true THEN
        center_count := center_count + 1;
    ELSIF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        center_count := center_count + 1;
    END IF;
    
    -- Verificar limite
    IF center_count > 5 THEN
        RAISE EXCEPTION 'Limite máximo de 5 centros de custo por organização atingido';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular gastos do mês
CREATE OR REPLACE FUNCTION get_monthly_expenses(
    p_organization_id UUID,
    p_month_year DATE
)
RETURNS TABLE (
    cost_center_id UUID,
    cost_center_name VARCHAR,
    total_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.name,
        COALESCE(SUM(e.amount), 0) as total_amount
    FROM cost_centers cc
    LEFT JOIN expenses e ON e.cost_center_id = cc.id 
        AND e.organization_id = p_organization_id
        AND e.status = 'confirmed'
        AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', p_month_year)
    WHERE cc.organization_id = p_organization_id
    GROUP BY cc.id, cc.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para validar limite de centros de custo
CREATE TRIGGER validate_cost_centers_limit_trigger
    BEFORE INSERT OR UPDATE ON cost_centers
    FOR EACH ROW EXECUTE FUNCTION validate_cost_centers_limit();
`;

    const { error: functionsError } = await supabase.rpc('exec_sql', {
      sql: functionsContent
    });
    
    if (functionsError) {
      console.error('❌ Erro ao aplicar funções:', functionsError);
      return;
    }
    
    console.log('✅ Funções e triggers aplicados com sucesso!');
    console.log('🎉 Schema V2 completamente configurado!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applySchema();
