-- ============================================================================
-- SETUP RÁPIDO - CRIAR TABELAS ESSENCIAIS PRIMEIRO
-- Execute ESTE arquivo primeiro, depois o FRESH_DATABASE_SETUP.sql
-- ============================================================================

-- Criar tabelas core que o Supabase não cria automaticamente

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  admin_id UUID REFERENCES auth.users(id),
  email VARCHAR(255),
  invite_code VARCHAR(10) NOT NULL DEFAULT 'ABC123',
  type VARCHAR(20) DEFAULT 'family' CHECK (type IN ('solo', 'family')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  phone_verified BOOLEAN DEFAULT false,
  whatsapp_phone VARCHAR(20),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  default_split_percentage DECIMAL(5,2) DEFAULT 0.00,
  color VARCHAR(7) DEFAULT '#3B82F6',
  user_id UUID REFERENCES users(id),
  linked_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT FALSE,
  type VARCHAR(20) DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_type ON budget_categories(type);

SELECT '✅ Tabelas essenciais criadas com sucesso!' as status;

