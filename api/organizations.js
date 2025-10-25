import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * API de Organizações - FinTrack V2
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

/**
 * GET - Buscar organizações do usuário
 */
async function handleGet(req, res) {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Buscar organizações do usuário
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        *,
        users!inner(id, name, email, phone, role)
      `)
      .eq('users.id', user_id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      organizations: organizations || []
    });

  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST - Criar nova organização
 */
async function handlePost(req, res) {
  try {
    const { name, admin_id } = req.body;
    
    if (!name || !admin_id) {
      return res.status(400).json({ error: 'name and admin_id are required' });
    }

    // Gerar código de convite único
    const inviteCode = generateInviteCode();

    // Criar organização
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        admin_id,
        invite_code: inviteCode
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Adicionar admin como usuário
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: admin_id,
        organization_id: organization.id,
        role: 'admin',
        name: 'Admin', // TODO: Buscar nome do usuário
        email: 'admin@example.com', // TODO: Buscar email do usuário
        phone: '5511999999999' // TODO: Buscar telefone do usuário
      });

    if (userError) throw userError;

    // Criar centros de custo padrão
    await createDefaultCostCenters(organization.id);

    // Criar categorias de orçamento padrão
    await createDefaultBudgetCategories(organization.id);

    res.status(201).json({
      success: true,
      organization: {
        ...organization,
        invite_code: inviteCode
      }
    });

  } catch (error) {
    console.error('❌ Error creating organization:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT - Atualizar organização
 */
async function handlePut(req, res) {
  try {
    const { id, name } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { data, error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      organization: data
    });

  } catch (error) {
    console.error('❌ Error updating organization:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE - Deletar organização
 */
async function handleDelete(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Organization deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting organization:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Gerar código de convite único
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Criar centros de custo padrão
 */
async function createDefaultCostCenters(organizationId) {
  const defaultCenters = [
    { name: 'Felipe', type: 'individual', color: '#3B82F6' },
    { name: 'Letícia', type: 'individual', color: '#EC4899' },
    { name: 'Compartilhado', type: 'shared', split_percentage: 50.00, color: '#8B5CF6' }
  ];

  for (const center of defaultCenters) {
    await supabase
      .from('cost_centers')
      .insert({
        organization_id: organizationId,
        ...center
      });
  }
}

/**
 * Criar categorias de orçamento padrão
 */
async function createDefaultBudgetCategories(organizationId) {
  const defaultCategories = [
    { name: 'Alimentação', color: '#EF4444' },
    { name: 'Transporte', color: '#F59E0B' },
    { name: 'Saúde', color: '#10B981' },
    { name: 'Lazer', color: '#8B5CF6' },
    { name: 'Contas', color: '#06B6D4' },
    { name: 'Casa', color: '#8B5A2B' },
    { name: 'Educação', color: '#EC4899' },
    { name: 'Investimentos', color: '#10B981' },
    { name: 'Outros', color: '#6B7280' }
  ];

  for (const category of defaultCategories) {
    await supabase
      .from('budget_categories')
      .insert({
        organization_id: organizationId,
        name: category.name,
        color: category.color,
        is_default: true
      });
  }
}
