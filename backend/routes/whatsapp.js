import express from 'express';
import { parseButtonReply, sendTextMessage } from '../services/whatsapp.js';
import { updateExpenseOwner } from '../services/supabase.js';

const router = express.Router();

/**
 * GET /webhook
 * Verify webhook for WhatsApp
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fintrack_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * POST /webhook
 * Receive WhatsApp button responses and update expense owner
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    
    // Quickly respond to WhatsApp to avoid timeout
    res.sendStatus(200);
    
    // Parse button reply
    const reply = parseButtonReply(body);
    
    if (reply) {
      const { expenseId, owner, split } = reply;
      
      // Update expense in Supabase
      await updateExpenseOwner(expenseId, owner, split);
      
      // Send confirmation message
      await sendTextMessage(
        `✅ Despesa atribuída a: ${owner}${split ? ' (compartilhado)' : ''}`
      );
      
      console.log(`Updated expense ${expenseId} - Owner: ${owner}, Split: ${split}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Don't send error response as we already responded with 200
  }
});

export default router;

