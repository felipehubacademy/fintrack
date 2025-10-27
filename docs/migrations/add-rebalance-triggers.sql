-- ============================================================================
-- Migration: Adicionar triggers de rebalanceamento de split percentage
-- Data: 2025-10-27
-- Descrição: Garante que cost centers são rebalanceados para 50/50 quando 2º membro entra
-- ============================================================================

-- Função para rebalancear quando 2º membro entra
CREATE OR REPLACE FUNCTION rebalance_split_percentages_on_new_member()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
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
    
    RAISE NOTICE '🔍 [REBALANCE] Novo membro: %, Organização: %, Total de membros: %', NEW.name, NEW.organization_id, member_count;
    
    -- Se é exatamente 2 membros, rebalancear para 50/50
    IF member_count = 2 THEN
      RAISE NOTICE '✅ Rebalanceando cost centers para 50/50 (2º membro adicionado)';
      
      UPDATE cost_centers
      SET default_split_percentage = 50.00,
          updated_at = NOW()
      WHERE organization_id = NEW.organization_id
        AND user_id IS NOT NULL
        AND is_active = true;
      
      RAISE NOTICE '✅ Cost centers rebalanceados para 50%% cada';
    ELSIF member_count > 2 THEN
      RAISE NOTICE '⚠️ Mais de 2 membros (%), mantendo split atual', member_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dropar trigger existente se existir
DROP TRIGGER IF EXISTS trigger_rebalance_on_new_member ON users;

-- Criar trigger
CREATE TRIGGER trigger_rebalance_on_new_member
  AFTER UPDATE OF organization_id ON users
  FOR EACH ROW
  WHEN (OLD.organization_id IS NULL AND NEW.organization_id IS NOT NULL)
  EXECUTE FUNCTION rebalance_split_percentages_on_new_member();

-- Verificar se a função foi criada
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída: Triggers de rebalanceamento adicionados!';
  RAISE NOTICE '📊 Função: rebalance_split_percentages_on_new_member';
  RAISE NOTICE '📊 Trigger: trigger_rebalance_on_new_member';
END $$;

