-- ============================================
-- ADICIONAR COLUNAS default_split_percentage E color EM pending_invites
-- ============================================
-- Descrição: Permite armazenar split percentage e cor escolhidos no momento do convite
--            Esses valores serão usados ao criar o cost_center quando o usuário aceitar

DO $$ 
BEGIN
  -- Adicionar coluna default_split_percentage se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' 
    AND column_name = 'default_split_percentage'
  ) THEN
    ALTER TABLE pending_invites 
    ADD COLUMN default_split_percentage DECIMAL(5,2) DEFAULT 50.00;
    
    RAISE NOTICE 'Coluna default_split_percentage adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna default_split_percentage já existe.';
  END IF;

  -- Adicionar coluna color se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE pending_invites 
    ADD COLUMN color VARCHAR(7) DEFAULT '#6366F1';
    
    RAISE NOTICE 'Coluna color adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna color já existe.';
  END IF;
END $$;

-- Adicionar comentários
COMMENT ON COLUMN pending_invites.default_split_percentage IS 'Percentual de split padrão para o cost center do convidado (usado ao aceitar convite)';
COMMENT ON COLUMN pending_invites.color IS 'Cor do perfil para o cost center do convidado (usado ao aceitar convite)';

-- Verificação
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pending_invites'
AND column_name IN ('default_split_percentage', 'color')
ORDER BY column_name;

