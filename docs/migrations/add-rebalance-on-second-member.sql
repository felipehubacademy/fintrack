-- ============================================
-- REBALANCEAR PERCENTUAIS QUANDO 2º MEMBRO ACEITAR
-- ============================================
-- Quando o 2º membro é adicionado, rebalancear cost centers existentes para 50/50

CREATE OR REPLACE FUNCTION rebalance_split_percentages_on_new_member()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
  existing_centers_count INTEGER;
BEGIN
  -- Só executar quando organization_id é definido (quando aceita convite)
  IF NEW.organization_id IS NOT NULL 
     AND NEW.role IN ('admin', 'member')
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    -- Contar quantos membros ativos tem na organização
    SELECT COUNT(*) INTO member_count
    FROM users
    WHERE organization_id = NEW.organization_id
      AND is_active = true
      AND role IN ('admin', 'member');
    
    -- Contar quantos cost centers vinculados a usuários existem
    SELECT COUNT(*) INTO existing_centers_count
    FROM cost_centers
    WHERE organization_id = NEW.organization_id
      AND user_id IS NOT NULL
      AND is_active = true;
    
    -- Se é o 2º membro E existem 2 cost centers, rebalancear para 50/50
    IF member_count = 2 AND existing_centers_count >= 2 THEN
      RAISE NOTICE 'Rebalanceando cost centers para 50/50 (2º membro adicionado): membros = %, centers = %', member_count, existing_centers_count;
      
      UPDATE cost_centers
      SET default_split_percentage = 50.00,
          updated_at = NOW()
      WHERE organization_id = NEW.organization_id
        AND user_id IS NOT NULL
        AND is_active = true;
      
      RAISE NOTICE 'Cost centers rebalanceados para 50%% cada';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger na tabela users
DROP TRIGGER IF EXISTS trigger_rebalance_on_new_member ON users;

CREATE TRIGGER trigger_rebalance_on_new_member
  AFTER UPDATE OF organization_id ON users
  FOR EACH ROW
  WHEN (OLD.organization_id IS NULL AND NEW.organization_id IS NOT NULL)
  EXECUTE FUNCTION rebalance_split_percentages_on_new_member();

-- Comentário
COMMENT ON FUNCTION rebalance_split_percentages_on_new_member() IS 
'Rebalanceia cost centers para 50/50 automaticamente quando o 2º membro é adicionado à organização';

