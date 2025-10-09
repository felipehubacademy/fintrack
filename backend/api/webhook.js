import dotenv from 'dotenv';
import { parseButtonReply, sendConfirmationMessage } from '../services/whatsapp.js';
import TransactionService from '../services/transactionService.js';

dotenv.config();

const transactionService = new TransactionService();

/**
 * Vercel Serverless Function for WhatsApp Webhook
 * Updated: 2025-10-09 21:00 with template confirmation
 */
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    // Webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fintrack_whatsapp_2024';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      return res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    // Webhook event handler
    const body = req.body;
    console.log('📩 Received webhook:', JSON.stringify(body, null, 2));
    
    // Quickly respond to WhatsApp to avoid timeout
    res.status(200).send('OK');
    
    // Process webhook data asynchronously
    processWebhookAsync(body).catch(error => {
      console.error('❌ Error processing webhook async:', error);
    });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

/**
 * Process webhook asynchronously
 */
async function processWebhookAsync(body) {
  try {
    console.log('🔄 Starting processWebhookAsync...');
    
    const buttonReply = parseButtonReply(body);
    
    if (!buttonReply || !buttonReply.owner) {
      console.log('⚠️ No valid button reply found');
      return;
    }

    console.log(`🔘 Button clicked: ${buttonReply.buttonText} → Owner: ${buttonReply.owner}`);
    console.log(`📧 Message ID: ${buttonReply.messageId}`);
    
    console.log('🔍 Buscando transação no Supabase...');
    
    // Buscar a transação pelo WhatsApp Message ID
    const transaction = await transactionService.getTransactionByWhatsAppId(buttonReply.messageId);
    
    if (!transaction) {
      console.log('⚠️ Transação não encontrada para esse Message ID');
      return;
    }

    console.log(`💰 Transação encontrada: ${transaction.description} - R$ ${transaction.amount}`);
    
    console.log('💾 Confirmando transação...');
    
    // Confirmar transação com o owner
    const confirmedTransaction = await transactionService.confirmTransaction(
      transaction.pluggy_transaction_id,
      buttonReply.owner,
      buttonReply.messageId
    );
    
    console.log('✅ Transação confirmada!');
    console.log('📊 Calculando totais mensais...');
    
    // Buscar totais mensais
    const monthlyTotal = await transactionService.getMonthlyTotal(buttonReply.owner);
    
    console.log(`💰 Totais: ${JSON.stringify(monthlyTotal)}`);
    console.log('📱 Enviando confirmação WhatsApp...');
    
    // Enviar mensagem de confirmação
    await sendConfirmationMessage(buttonReply.owner, confirmedTransaction, monthlyTotal);
    
    console.log(`✅ Transação processada com sucesso para ${buttonReply.owner}`);
    
  } catch (error) {
    console.error('❌ Error in processWebhookAsync:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

