import dotenv from 'dotenv';
dotenv.config();

import ZulAssistant from './services/zulAssistant.js';

async function updateAssistant() {
  console.log('🔄 Forçando atualização do Assistant...\n');
  
  const zul = new ZulAssistant();
  
  // Limpar cache do Assistant ID para forçar recriação/atualização
  zul.assistantId = null;
  
  // Recuperar/Criar Assistant (isso vai executar o update)
  const assistantId = await zul.getOrCreateAssistant();
  
  console.log('\n✅ Assistant atualizado com sucesso!');
  console.log('📋 Assistant ID:', assistantId);
  
  process.exit(0);
}

updateAssistant().catch(error => {
  console.error('❌ Erro ao atualizar Assistant:', error);
  process.exit(1);
});

