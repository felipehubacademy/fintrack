import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * API: /api/expenses/general
 * CRUD para despesas gerais (não-cartão)
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in /api/expenses/general:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET: Listar despesas gerais
 * Query params:
 *   - month: YYYY-MM (filtro por mês)
 *   - owner: Felipe/Leticia/Compartilhado
 *   - status: pending/confirmed/cancelled
 *   - payment_method: cash/debit/pix/credit_card
 */
async function handleGet(req, res) {
  const { month, owner, status, payment_method } = req.query;

  let query = supabase
    .from('expenses_general')
    .select('*')
    .order('date', { ascending: false });

  // Filtros
  if (month) {
    const startDate = `${month}-01`;
    const endDate = new Date(month + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const endDateStr = endDate.toISOString().split('T')[0];

    query = query.gte('date', startDate).lte('date', endDateStr);
  }

  if (owner && owner !== 'all') {
    query = query.eq('owner', owner);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (payment_method && payment_method !== 'all') {
    query = query.eq('payment_method', payment_method);
  }

  const { data, error } = await query;

  if (error) throw error;

  return res.status(200).json({
    success: true,
    count: data.length,
    expenses: data,
  });
}

/**
 * POST: Criar nova despesa geral
 * Body: { date, description, amount, category, owner, payment_method, whatsapp_message_id }
 */
async function handlePost(req, res) {
  const {
    date,
    description,
    amount,
    category,
    owner,
    payment_method,
    whatsapp_message_id,
  } = req.body;

  // Validações
  if (!description || !amount) {
    return res.status(400).json({
      error: 'description and amount are required',
    });
  }

  const { data, error } = await supabase
    .from('expenses_general')
    .insert({
      date: date || new Date().toISOString().split('T')[0],
      description,
      amount,
      category: category || 'Outros',
      owner,
      status: owner ? 'confirmed' : 'pending',
      split: owner === 'Compartilhado',
      payment_method: payment_method || 'cash',
      whatsapp_message_id,
      confirmed_at: owner ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;

  return res.status(201).json({
    success: true,
    expense: data,
  });
}

/**
 * PUT: Atualizar despesa geral
 * Body: { id, owner?, status?, payment_method?, ... }
 */
async function handlePut(req, res) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  // Se owner foi definido, marcar como confirmed
  if (updates.owner && !updates.status) {
    updates.status = 'confirmed';
    updates.confirmed_at = new Date().toISOString();
    updates.split = updates.owner === 'Compartilhado';
  }

  const { data, error } = await supabase
    .from('expenses_general')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return res.status(200).json({
    success: true,
    expense: data,
  });
}

/**
 * DELETE: Deletar despesa geral
 * Query: ?id=123
 */
async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const { error } = await supabase
    .from('expenses_general')
    .delete()
    .eq('id', id);

  if (error) throw error;

  return res.status(200).json({
    success: true,
    message: 'Expense deleted',
  });
}

