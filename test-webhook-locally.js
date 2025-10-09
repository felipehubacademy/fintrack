import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parseButtonReply, sendConfirmationMessage } from './backend/services/whatsapp.js';
import TransactionService from './backend/services/transactionService.js';

dotenv.config({ path: './backend/.env' });

const transactionService = new TransactionService();

// Payload que o Vercel recebeu
const webhookPayload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "254587284410534",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550643934",
              "phone_number_id": "280543888475181"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Felipe Xavier"
                },
                "wa_id": "5511978229898"
              }
            ],
            "messages": [
              {
                "context": {
                  "from": "15550643934",
                  "id": "wamid.HBgNNTUxMTk3ODIyOTg5OBUCABEYEjg1NEJBNjFBMjc3MDI0RDgxQwA="
                },
                "from": "5511978229898",
                "id": "wamid.HBgNNTUxMTk3ODIyOTg5OBUCABIYFDNBNjYxRkMxMEYwNTczMUIzNzY4AA==",
                "timestamp": "1760043572",
                "type": "button",
                "button": {
                  "payload": "Compartilhado",
                  "text": "Compartilhado"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

async function testWebhookLocally() {
  try {
    console.log('🧪 SIMULANDO WEBHOOK LOCALMENTE\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('1️⃣ PARSING BUTTON REPLY...');
    const buttonReply = parseButtonReply(webhookPayload);
    
    if (!buttonReply || !buttonReply.owner) {
      console.log('❌ No valid button reply found');
      return;
    }

    console.log(`   ✅ Owner: ${buttonReply.owner}`);
    console.log(`   📧 Message ID: ${buttonReply.messageId}`);
    console.log(`   📱 From: ${buttonReply.from}\n`);
    
    console.log('2️⃣ BUSCANDO TRANSAÇÃO NO SUPABASE...');
    const transaction = await transactionService.getTransactionByWhatsAppId(buttonReply.messageId);
    
    if (!transaction) {
      console.log('   ❌ Transação não encontrada');
      console.log(`   🔍 Procurando por Message ID: ${buttonReply.messageId}\n`);
      return;
    }

    console.log(`   ✅ Transação encontrada!`);
    console.log(`   🆔 ID: ${transaction.id}`);
    console.log(`   📝 Descrição: ${transaction.description}`);
    console.log(`   💰 Valor: R$ ${transaction.amount}`);
    console.log(`   📊 Status atual: ${transaction.status}\n`);
    
    console.log('3️⃣ CONFIRMANDO TRANSAÇÃO...');
    const confirmedTransaction = await transactionService.confirmTransaction(
      transaction.pluggy_transaction_id,
      buttonReply.owner,
      buttonReply.messageId
    );
    
    console.log(`   ✅ Transação confirmada!`);
    console.log(`   👤 Owner: ${confirmedTransaction.owner}`);
    console.log(`   📊 Status: ${confirmedTransaction.status}\n`);
    
    console.log('4️⃣ CALCULANDO TOTAIS MENSAIS...');
    const monthlyTotal = await transactionService.getMonthlyTotal(buttonReply.owner);
    
    console.log(`   📊 Totais de ${buttonReply.owner}:`);
    console.log(`      • Gastos próprios: R$ ${monthlyTotal.ownTotal}`);
    console.log(`      • Compartilhado (50%): R$ ${monthlyTotal.sharedIndividual}`);
    console.log(`      • TOTAL INDIVIDUAL: R$ ${monthlyTotal.individualTotal}\n`);
    
    console.log('5️⃣ ENVIANDO CONFIRMAÇÃO VIA WHATSAPP...');
    await sendConfirmationMessage(buttonReply.owner, confirmedTransaction, monthlyTotal);
    
    console.log('   ✅ Mensagem enviada!\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 FLUXO COMPLETO EXECUTADO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📱 Verifique seu WhatsApp agora!\n');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error('\n📋 Stack trace:');
    console.error(error.stack);
  }
}

testWebhookLocally();

