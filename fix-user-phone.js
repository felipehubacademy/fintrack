import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fixUserPhone() {
  try {
    console.log('🔧 CORRIGINDO TELEFONE DO USUÁRIO...\n');
    
    // Buscar usuário atual
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'felipe.xavier1987@gmail.com')
      .single();
    
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return;
    }
    
    console.log('👤 Usuário encontrado:', user.name, user.email);
    console.log('📱 Telefone atual:', user.phone || 'NÃO CADASTRADO');
    
    // Atualizar telefone
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        phone: '5511978229898',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erro ao atualizar telefone:', updateError);
      return;
    }
    
    console.log('✅ Telefone atualizado com sucesso!');
    console.log('📱 Novo telefone:', updatedUser.phone);
    
    // Verificar se o usuário agora pode ser encontrado por telefone
    const { data: userByPhone, error: phoneError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', '5511978229898')
      .eq('is_active', true)
      .single();
    
    if (phoneError) {
      console.error('❌ Erro ao buscar por telefone:', phoneError);
      return;
    }
    
    console.log('✅ Usuário encontrado por telefone:', userByPhone.name);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixUserPhone();
