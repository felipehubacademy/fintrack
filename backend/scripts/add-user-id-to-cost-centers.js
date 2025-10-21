import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addUserIdToCostCenters() {
  try {
    console.log('🔧 Adicionando coluna user_id na tabela cost_centers...');
    
    // 1. Adicionar coluna user_id
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE cost_centers 
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
      `
    });
    
    if (alterError) {
      console.error('❌ Erro ao adicionar coluna:', alterError);
      return;
    }
    
    console.log('✅ Coluna user_id adicionada');
    
    // 2. Criar índice
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_cost_centers_user_id ON cost_centers(user_id);
      `
    });
    
    if (indexError) {
      console.error('❌ Erro ao criar índice:', indexError);
    } else {
      console.log('✅ Índice criado');
    }
    
    // 3. Atualizar cost centers existentes
    console.log('🔄 Atualizando cost centers existentes...');
    
    const { data: costCenters, error: ccError } = await supabase
      .from('cost_centers')
      .select('id, name, organization_id, type')
      .eq('type', 'individual')
      .is('user_id', null);
    
    if (ccError) {
      console.error('❌ Erro ao buscar cost centers:', ccError);
      return;
    }
    
    console.log(`📊 Encontrados ${costCenters?.length || 0} cost centers para atualizar`);
    
    for (const cc of costCenters || []) {
      // Buscar usuário com primeiro nome igual
      const firstName = cc.name.split(' ')[0];
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('organization_id', cc.organization_id)
        .ilike('name', `${firstName}%`);
      
      if (usersError || !users?.length) {
        console.log(`⚠️ Usuário não encontrado para cost center: ${cc.name}`);
        continue;
      }
      
      // Usar o primeiro usuário encontrado
      const user = users[0];
      
      const { error: updateError } = await supabase
        .from('cost_centers')
        .update({ user_id: user.id })
        .eq('id', cc.id);
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar ${cc.name}:`, updateError);
      } else {
        console.log(`✅ Vinculado: ${cc.name} → ${user.name}`);
      }
    }
    
    console.log('✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

addUserIdToCostCenters();
