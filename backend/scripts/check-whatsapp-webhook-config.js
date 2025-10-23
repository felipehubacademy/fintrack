/**
 * Script para verificar configuração do WhatsApp Webhook
 * 
 * Este script ajuda a diagnosticar por que mensagens não estão chegando
 */

import 'dotenv/config';

console.log('🔍 Verificando configuração do WhatsApp Webhook...\n');

// 1. Verificar variáveis de ambiente
console.log('📋 Variáveis de Ambiente:');
console.log('  WHATSAPP_TOKEN:', process.env.WHATSAPP_TOKEN ? '✅ Configurado' : '❌ Faltando');
console.log('  WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ Configurado' : '❌ Faltando');
console.log('  WHATSAPP_BUSINESS_ACCOUNT_ID:', process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ? '✅ Configurado' : '❌ Faltando');
console.log('  WHATSAPP_VERIFY_TOKEN:', process.env.WHATSAPP_VERIFY_TOKEN ? '✅ Configurado' : '❌ Faltando');

// 2. URLs do Webhook
console.log('\n🌐 URLs do Webhook:');
console.log('  Production:', 'https://fintrack-hazel.vercel.app/api/webhook');
console.log('  Backup:', 'https://fintrack-backend.vercel.app/api/webhook');

// 3. Configurações necessárias no Meta
console.log('\n⚙️  Configurações necessárias no Meta App:');
console.log('\n  1. Webhook Subscriptions (CRÍTICO):');
console.log('     ✓ messages - Receber mensagens do usuário');
console.log('     ✓ message_status - Receber status de entrega');
console.log('     ✓ messaging_postbacks - Receber respostas de botões');
console.log('\n  2. Permissions:');
console.log('     ✓ whatsapp_business_messaging');
console.log('     ✓ whatsapp_business_management');

// 4. Checklist de troubleshooting
console.log('\n🔧 Checklist de Troubleshooting:');
console.log('\n  [ ] O webhook está verificado no Meta?');
console.log('      → Meta Business > WhatsApp > Configuração > Webhook');
console.log('      → Status deve ser "Verificado" (verde)');
console.log('\n  [ ] As subscrições estão ativas?');
console.log('      → Deve ter checkmarks em: messages, message_status');
console.log('\n  [ ] O número de telefone está configurado?');
console.log('      → Meta Business > WhatsApp > Números de Telefone');
console.log('      → Número deve estar "Conectado"');
console.log('\n  [ ] As permissões foram aceitas?');
console.log('      → Meta Business > Configurações > Permissões');
console.log('      → Todas as permissões devem estar "Aprovadas"');
console.log('\n  [ ] O token tem as permissões corretas?');
console.log('      → Gerar novo token se necessário');
console.log('      → Incluir: whatsapp_business_messaging, whatsapp_business_management');

// 5. Teste manual
console.log('\n🧪 Teste Manual:');
console.log('\n  1. Envie "teste" para o número WhatsApp');
console.log('  2. Verifique os logs do Vercel:');
console.log('     → https://vercel.com/felipehubacademy/fintrack/logs');
console.log('  3. Procure por:');
console.log('     → "📩 [B1] Received webhook:" - deve mostrar o payload completo');
console.log('     → "value.messages" - deve conter sua mensagem');
console.log('     → Se só aparecer "statuses", o problema é na configuração do Meta');

// 6. Payload esperado
console.log('\n📦 Payload Esperado (quando funciona):');
console.log(`
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{                    ← ISSO DEVE APARECER!
          "from": "5511978229898",
          "id": "wamid.xxx",
          "timestamp": "1729712345",
          "text": {
            "body": "teste"              ← SUA MENSAGEM AQUI
          },
          "type": "text"
        }]
      }
    }]
  }]
}
`);

console.log('\n📦 Payload Atual (só status):');
console.log(`
{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [...]               ← SÓ TEM STATUS, FALTAM AS MENSAGENS!
      }
    }]
  }]
}
`);

// 7. Solução
console.log('\n✅ SOLUÇÃO:');
console.log('\n  1. Acesse: https://developers.facebook.com/apps/');
console.log('  2. Selecione o app do FinTrack');
console.log('  3. WhatsApp > Configuração > Webhook');
console.log('  4. Clique em "Editar" nas subscrições');
console.log('  5. MARQUE o checkbox "messages" ← ESSE É O PROBLEMA!');
console.log('  6. Salve as alterações');
console.log('  7. Teste novamente enviando uma mensagem');
console.log('\n  Se não funcionar:');
console.log('  8. Remova o webhook');
console.log('  9. Adicione novamente com a URL:');
console.log('     https://fintrack-hazel.vercel.app/api/webhook');
console.log('  10. Token de verificação: fintrack_verify_token');
console.log('  11. Marque: messages, message_status, messaging_postbacks');

console.log('\n✨ Após configurar, as mensagens chegarão ao webhook!\n');

