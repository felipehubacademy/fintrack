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
    
    // Process webhook data BEFORE responding (Vercel kills connection after response!)
    processWebhookAsync(body)
      .then(() => {
        console.log('✅ Webhook processed successfully');
        res.status(200).send('OK');
      })
      .catch(error => {
        console.error('❌ Error processing webhook:', error);
        res.status(200).send('OK'); // Still respond OK to avoid retries
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
    console.log(`   Message ID para buscar: ${buttonReply.messageId}`);
    
    // Buscar transação real no Supabase
    const transaction = await transactionService.getTransactionByWhatsAppId(buttonReply.messageId);
    
    if (!transaction) {
      console.log('⚠️ Transação não encontrada para esse Message ID');
      return;
    }

    console.log(`💰 Transação encontrada: ${transaction.description} - R$ ${transaction.amount}`);
    
    // Confirmar transação no Supabase
    console.log('💾 Confirmando transação no Supabase...');
    const confirmedTransaction = await transactionService.confirmTransaction(
      transaction.id,
      buttonReply.owner
    );
    
    console.log('✅ Transação confirmada no Supabase!');
    console.log('📊 Calculando totais do mês...');
    
    // Calcular totais reais do mês
    const monthlyTotal = await transactionService.getMonthlyTotal(buttonReply.owner);
    
    console.log(`💰 Totais calculados: ${JSON.stringify(monthlyTotal)}`);
    console.log('📱 Enviando confirmação WhatsApp...');
    
    // Enviar mensagem de confirmação com timeout
    try {
      const confirmPromise = sendConfirmationMessage(buttonReply.owner, confirmedTransaction, monthlyTotal);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WhatsApp confirmation timeout (8s)')), 8000)
      );
      
      await Promise.race([confirmPromise, timeoutPromise]);
      console.log(`✅ Confirmação enviada com sucesso!`);
    } catch (whatsappError) {
      console.error('❌ ERRO ao enviar confirmação WhatsApp:', whatsappError.message);
      console.error('Stack:', whatsappError.stack);
      // Não lançar erro - já processamos a transação
    }
    
    console.log(`✅ Transação processada com sucesso para ${buttonReply.owner}`);
    
  } catch (error) {
    console.error('❌ Error in processWebhookAsync:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

