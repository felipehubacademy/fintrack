import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: 'Email and phone are required' });
    }

    console.log(`🔧 Atualizando telefone para usuário: ${email}`);

    // Buscar usuário por email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('👤 Usuário encontrado:', user.name);

    // Atualizar telefone
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        phone: phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar telefone:', updateError);
      return res.status(500).json({ error: 'Failed to update phone' });
    }

    console.log('✅ Telefone atualizado:', updatedUser.phone);

    return res.status(200).json({
      success: true,
      message: 'Phone updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone
      }
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
