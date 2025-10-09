import dotenv from 'dotenv';
import LatamService from '../services/latamService.js';
import TransactionService from '../services/transactionService.js';
import { sendTransactionNotification } from '../services/whatsapp.js';

dotenv.config({ path: './backend/.env' });

/**
 * Vercel Serverless Function - Check for new transactions
 * Called by GitHub Actions every minute
 */
export default async function handler(req, res) {
  console.log('🔍 Starting transaction check...');
  
  try {
    const latamService = new LatamService();
    const transactionService = new TransactionService();
    
    // 1. Buscar transações do LATAM
    console.log('📊 Fetching LATAM transactions...');
    const latamTransactions = await latamService.getLatamTransactions();
    console.log(`✅ Found ${latamTransactions.length} LATAM transactions`);
    
    // 2. Verificar quais são novas (não existem no Supabase)
    const newTransactions = [];
    
    for (const transaction of latamTransactions) {
      const exists = await transactionService.transactionExists(transaction.id);
      
      if (!exists) {
        newTransactions.push(transaction);
      }
    }
    
    console.log(`🆕 Found ${newTransactions.length} new transactions`);
    
    // 3. Para cada transação nova:
    //    - Enviar notificação WhatsApp
    //    - Salvar no Supabase com whatsapp_message_id
    
    const results = [];
    
    for (const transaction of newTransactions) {
      try {
        // Enviar notificação WhatsApp
        console.log(`📱 Sending WhatsApp notification for: ${transaction.description}`);
        const whatsappResponse = await sendTransactionNotification(transaction);
        const whatsappMessageId = whatsappResponse.messages[0].id;
        
        console.log(`✅ WhatsApp sent, Message ID: ${whatsappMessageId}`);
        
        // Salvar no Supabase
        const saved = await transactionService.saveTransaction(
          transaction,
          whatsappMessageId
        );
        
        console.log(`✅ Saved to Supabase: ID ${saved.id}`);
        
        results.push({
          transaction_id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          whatsapp_message_id: whatsappMessageId,
          supabase_id: saved.id,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`❌ Error processing transaction ${transaction.id}:`, error.message);
        results.push({
          transaction_id: transaction.id,
          description: transaction.description,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    // 4. Retornar resultado
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      total_transactions: latamTransactions.length,
      new_transactions: newTransactions.length,
      processed: results.length,
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error in check function:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

