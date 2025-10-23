-- Migration: Adicionar coluna 'name' à tabela pending_invites
-- Data: 2025-10-23
-- Descrição: Adiciona coluna para armazenar o nome completo do usuário convidado

-- 1. Adicionar coluna 'name'
ALTER TABLE pending_invites 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 2. Adicionar comentário
COMMENT ON COLUMN pending_invites.name IS 'Nome completo do usuário convidado (preenchido pelo inviter)';

