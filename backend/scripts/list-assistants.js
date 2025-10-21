import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function listAssistants() {
  try {
    console.log('🔍 Listando Assistants...\n');
    
    const assistants = await openai.beta.assistants.list();
    
    if (assistants.data.length === 0) {
      console.log('❌ Nenhum Assistant encontrado.');
      return;
    }
    
    console.log(`✅ Encontrados ${assistants.data.length} Assistant(s):\n`);
    
    assistants.data.forEach((assistant, index) => {
      console.log(`${index + 1}. ${assistant.name || '(sem nome)'}`);
      console.log(`   ID: ${assistant.id}`);
      console.log(`   Model: ${assistant.model}`);
      console.log(`   Created: ${new Date(assistant.created_at * 1000).toLocaleString('pt-BR')}`);
      console.log('');
    });
    
    // Procurar especificamente pelo ZUL
    const zulAssistant = assistants.data.find(a => a.name === 'ZUL - MeuAzulão');
    if (zulAssistant) {
      console.log('🎯 ZUL Assistant encontrado!');
      console.log(`   ID: ${zulAssistant.id}`);
      console.log('\n📋 Para usar este ID, adicione ao Vercel:');
      console.log(`   OPENAI_ASSISTANT_ID=${zulAssistant.id}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar Assistants:', error.message);
  }
}

listAssistants();

