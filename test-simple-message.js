import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './backend/.env' });

async function testSimpleMessage() {
  try {
    console.log('📱 Testando mensagem simples do WhatsApp...');
    
    const phoneNumberId = '280543888475181';
    const accessToken = 'EAAafO1sejkwBPsSxuYhjVm4sLr2n8ZBPMLI0gt3YDZCadbl46O0C1TMABuhuaonbdhtDuFKqGGuuka6r4N6IEINpNd0Aw6OsecexwPvCWOi0whwoaMqM8XmTHDFiqtnTjYJL7m2U7zaJLLPZC24VRlpZAWqNFS1Pfb89g9o7XjMSlr4zy8KG9MLGZCQ549eeNZCq0D7cmiCLZArdp8LdxP5AZCwqJsw9ORSveMGZChZBsZD';
    const userPhone = process.env.USER_PHONE || '+5511978229898';
    
    // Mensagem de transação detectada (simples, sem botões)
    const messageData = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'text',
      text: {
        body: `💰 *Nova Transação Detectada!*\n\n🏷️ *Descrição:* SEPHORA RJ\n💵 *Valor:* R$ 89,90\n📅 *Data:* 15/01/2024\n🏦 *Cartão:* LATAM PASS ITAU VISA INFINITE\n\n💡 *Para categorizar, responda:*\n• "Confirmar" - para aceitar\n• "Ignorar" - para pular\n• "Editar" - para modificar`
      }
    };
    
    console.log('📤 Enviando mensagem de transação...');
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Mensagem enviada com sucesso!');
      console.log('📱 Resposta:', JSON.stringify(result, null, 2));
      
      console.log('\n🎯 MENSAGEM SIMPLES FUNCIONANDO!');
      console.log('📋 Usuário pode responder:');
      console.log('   • "Confirmar" - aceita a transação');
      console.log('   • "Ignorar" - pula a transação');
      console.log('   • "Editar" - modifica a categoria');
      
    } else {
      const error = await response.json();
      console.log('❌ Erro ao enviar mensagem:');
      console.log(JSON.stringify(error, null, 2));
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testSimpleMessage();
