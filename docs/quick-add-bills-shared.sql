-- Script rápido para adicionar is_shared na tabela bills
ALTER TABLE bills ADD COLUMN is_shared BOOLEAN DEFAULT false;
