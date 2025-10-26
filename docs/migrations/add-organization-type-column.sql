-- ============================================
-- ADICIONAR COLUNA TYPE EM ORGANIZATIONS
-- ============================================
-- Adiciona coluna type para distinguir contas solo vs familiares

-- 1. Adicionar coluna type
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'family' CHECK (type IN ('solo', 'family'));

-- 2. Adicionar comentário
COMMENT ON COLUMN organizations.type IS 'Tipo de organização: solo (individual) ou family (familiar)';

-- 3. Criar índice
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- 4. Atualizar organizações existentes baseado no número de membros
-- Se tiver apenas 1 membro, é solo. Se tiver 2+, é family
UPDATE organizations o
SET type = CASE 
  WHEN member_count = 1 THEN 'solo'
  ELSE 'family'
END
FROM (
  SELECT organization_id, COUNT(*) as member_count
  FROM users
  WHERE is_active = true
  GROUP BY organization_id
) members
WHERE o.id = members.organization_id;

-- 5. Para novas organizações com apenas 1 cost center vinculado a usuário, definir como 'solo'
-- (será atualizado automaticamente quando adicionar mais membros)

