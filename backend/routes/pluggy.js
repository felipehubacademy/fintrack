import express from 'express';
import { getAllTransactions, getPluggyApiKey } from '../services/pluggy.js';
import { saveExpense, transactionExists } from '../services/supabase.js';
import { sendTransactionNotification } from '../services/whatsapp.js';

const router = express.Router();

/**
 * GET /check
 * Fetch new transactions from Pluggy and save to Supabase
 */
router.get('/check', async (req, res) => {
  try {
    const connectionId = process.env.PLUGGY_CONNECTION_ID;
    
    // Get transactions from the last 7 days
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const fromDateStr = fromDate.toISOString().split('T')[0];
    
    const transactions = await getAllTransactions(connectionId, fromDateStr);
    
    let newCount = 0;
    const savedTransactions = [];
    
    for (const transaction of transactions) {
      // Only process debit transactions (expenses)
      if (transaction.amount >= 0) continue;
      
      const date = transaction.date.split('T')[0];
      const description = transaction.description || 'Transação sem descrição';
      const amount = Math.abs(transaction.amount);
      
      // Check if transaction already exists
      const exists = await transactionExists(date, description, amount);
      
      if (!exists) {
        // Save to Supabase
        const expense = await saveExpense({
          date,
          description,
          amount,
          source: 'pluggy',
        });
        
        // Send WhatsApp notification
        try {
          await sendTransactionNotification(
            { description, amount },
            expense.id
          );
        } catch (whatsappError) {
          console.error('Failed to send WhatsApp notification:', whatsappError);
          // Continue even if WhatsApp fails
        }
        
        savedTransactions.push(expense);
        newCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${transactions.length} transactions, ${newCount} new expenses saved`,
      newExpenses: savedTransactions,
    });
  } catch (error) {
    console.error('Error checking transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth
 * Test Pluggy authentication
 */
router.post('/auth', async (req, res) => {
  try {
    const apiKey = await getPluggyApiKey();
    res.json({
      success: true,
      message: 'Authentication successful',
      apiKey: apiKey.substring(0, 10) + '...',
    });
  } catch (error) {
    console.error('Error authenticating with Pluggy:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

