-- Migration: Criar tabela de interessados (lista de espera)
-- Data: 2025-11-20
-- Descrição: Tabela para coletar dados de interessados que tentam se cadastrar antes da liberação da solução

CREATE TABLE IF NOT EXISTS public.interested_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Informações do interessado
  position INTEGER NOT NULL, -- Posição na fila (calculada: contagem total + 100)
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL, -- Formato: 5511999999999 (55 + DDD + número, sem formatação)
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('solo', 'family')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_interested_users_email ON interested_users(email);
CREATE INDEX IF NOT EXISTS idx_interested_users_phone ON interested_users(phone);
CREATE INDEX IF NOT EXISTS idx_interested_users_account_type ON interested_users(account_type);
CREATE INDEX IF NOT EXISTS idx_interested_users_created_at ON interested_users(created_at);
CREATE INDEX IF NOT EXISTS idx_interested_users_position ON interested_users(position);

-- Comentários para documentação
COMMENT ON TABLE interested_users IS 'Lista de interessados que aguardam liberação da solução MeuAzulão';
COMMENT ON COLUMN interested_users.position IS 'Posição na fila (calculada como contagem total de registros + 100)';
COMMENT ON COLUMN interested_users.phone IS 'Telefone normalizado: 55 + DDD + número (ex: 5511999999999)';
COMMENT ON COLUMN interested_users.account_type IS 'Tipo de conta selecionada: solo (individual) ou family (família)';

