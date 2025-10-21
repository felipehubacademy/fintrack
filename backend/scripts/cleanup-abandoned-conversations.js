import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Limpar conversas abandonadas (> 2 dias sem atualização)
 */
async function cleanupAbandonedConversations() {
  try {
    console.log('🧹 Iniciando limpeza de conversas abandonadas...');
    
    // Data limite: 2 dias atrás
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    
    // Buscar conversas não-idle que não foram atualizadas há mais de 2 dias
    const { data: abandonedConversations, error: selectError } = await supabase
      .from('conversation_state')
      .select('id, user_phone, state, updated_at, temp_data')
      .neq('state', 'idle')
      .lt('updated_at', twoDaysAgo);
    
    if (selectError) {
      throw selectError;
    }
    
    console.log(`📊 Encontradas ${abandonedConversations?.length || 0} conversas abandonadas`);
    
    if (!abandonedConversations || abandonedConversations.length === 0) {
      console.log('✅ Nenhuma conversa para limpar!');
      return;
    }
    
    // Exibir detalhes das conversas que serão limpas
    for (const conv of abandonedConversations) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(conv.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`  - ${conv.user_phone} (${conv.state}) - ${daysSinceUpdate} dias sem atualização`);
    }
    
    // Limpar conversas abandonadas (marcar como idle e limpar temp_data)
    const { data: updatedConversations, error: updateError } = await supabase
      .from('conversation_state')
      .update({
        state: 'idle',
        temp_data: {}
      })
      .neq('state', 'idle')
      .lt('updated_at', twoDaysAgo)
      .select();
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`✅ ${updatedConversations?.length || 0} conversas limpas com sucesso!`);
    
    // Opcional: Deletar registros idle antigos (> 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedRows, error: deleteError } = await supabase
      .from('conversation_state')
      .delete()
      .eq('state', 'idle')
      .lt('updated_at', sevenDaysAgo)
      .select();
    
    if (deleteError) {
      console.error('⚠️ Erro ao deletar registros antigos:', deleteError);
    } else {
      console.log(`🗑️ ${deletedRows?.length || 0} registros idle antigos deletados`);
    }
    
    console.log('✅ Limpeza concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao limpar conversas:', error);
    process.exit(1);
  }
}

// Executar
cleanupAbandonedConversations();

