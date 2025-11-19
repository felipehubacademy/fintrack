/**
 * API: Create Interested User
 * Salvar interessado na lista de espera
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalizar telefone: remover formatação e adicionar código do Brasil (55)
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, ''); // Remove tudo que não é número
  return `55${digits}`; // Adiciona código do Brasil
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { name, email, phone, account_type } = req.body;

    // Validações
    if (!name || !email || !phone || !account_type) {
      return res.status(400).json({ 
        success: false,
        error: 'Campos obrigatórios: name, email, phone, account_type' 
      });
    }

    // Validar tipo de conta
    if (!['solo', 'family'].includes(account_type)) {
      return res.status(400).json({ 
        success: false,
        error: 'account_type deve ser "solo" ou "family"' 
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Email inválido' 
      });
    }

    // Validar telefone (deve ter 11 dígitos após remover formatação)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      return res.status(400).json({ 
        success: false,
        error: 'Telefone inválido. Use formato: (DDD) NNNNN-NNNN' 
      });
    }

    // Normalizar telefone
    const normalizedPhone = normalizePhone(phone);

    // Contar total de registros existentes
    const { count, error: countError } = await supabase
      .from('interested_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Erro ao contar registros:', countError);
      throw countError;
    }

    // Calcular posição (contagem + 100)
    const position = (count || 0) + 100;

    // Verificar se email já existe
    const { data: existingEmail } = await supabase
      .from('interested_users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Este email já está cadastrado na lista de espera'
      });
    }

    // Verificar se telefone já existe
    const { data: existingPhone } = await supabase
      .from('interested_users')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: 'Este telefone já está cadastrado na lista de espera'
      });
    }

    // Criar interessado
    const { data: interestedUser, error } = await supabase
      .from('interested_users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: normalizedPhone,
        account_type: account_type,
        position: position
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar interessado:', error);
      throw error;
    }

    return res.status(201).json({
      success: true,
      interested_user: interestedUser,
      position: position
    });

  } catch (error) {
    console.error('Erro ao criar interessado:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

