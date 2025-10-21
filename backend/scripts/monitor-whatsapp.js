/**
 * Monitor de conversas WhatsApp em tempo real
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PHONE = '+5511978229898';

async function monitorConversation() {
  console.log('👀 Monitorando conversa do WhatsApp...\n');
  console.log('📱 Envie mensagens para o ZUL no WhatsApp agora!\n');
  
  let lastCheckTime = new Date();
  let messageCount = 0;
  
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Check a cada 2s
    
    try {
      // Verificar conversation_state
      const { data: conv } = await supabase
        .from('conversation_state')
        .select('*')
        .eq('user_phone', PHONE)
        .single();
      
      if (conv && conv.temp_data?.messages) {
        const messages = conv.temp_data.messages;
        
        if (messages.length > messageCount) {
          console.log(`\n💬 [${new Date().toLocaleTimeString()}] Nova mensagem(ns) detectada(s)!`);
          
          // Mostrar novas mensagens
          for (let i = messageCount; i < messages.length; i++) {
            const msg = messages[i];
            const emoji = msg.role === 'user' ? '👤' : '🤖';
            console.log(`${emoji} [${msg.role}]: ${msg.content}`);
          }
          
          messageCount = messages.length;
          
          // Mostrar estado
          console.log(`\n📊 Estado: ${conv.state}`);
          console.log(`📝 Total de mensagens: ${messageCount}`);
        }
      }
      
      // Verificar despesas recentes
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', lastCheckTime.toISOString())
        .order('created_at', { ascending: false });
      
      if (expenses && expenses.length > 0) {
        expenses.forEach(exp => {
          console.log(`\n💰 DESPESA SALVA! 💰`);
          console.log(`   📝 ${exp.description} - R$ ${exp.amount}`);
          console.log(`   💳 ${exp.payment_method}`);
          console.log(`   👤 ${exp.owner}`);
          console.log(`   🏷️  ${exp.category || 'Sem categoria'}`);
        });
        
        lastCheckTime = new Date();
      }
      
    } catch (error) {
      // Silenciar erros (ex: nenhum registro encontrado)
    }
  }
}

console.log('🚀 Iniciando monitor...\n');
console.log('═══════════════════════════════════════════════════════');
console.log('📱 TESTE MANUAL VIA WHATSAPP');
console.log('═══════════════════════════════════════════════════════');
console.log('\n1. Abra o WhatsApp');
console.log('2. Mande mensagens para o ZUL');
console.log('3. Acompanhe aqui em tempo real!\n');
console.log('═══════════════════════════════════════════════════════\n');

monitorConversation().catch(console.error);

