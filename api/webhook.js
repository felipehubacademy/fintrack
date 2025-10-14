import dotenv from 'dotenv';
import SmartConversation from '../services/smartConversation.js';

dotenv.config();

/**
 * Webhook inteligente para FinTrack V2
 * Processa mensagens WhatsApp com análise automática
 */
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    // Webhook verification
    const challenge = req.query.challenge;
    
    if (challenge) {
      console.log('✅ Smart webhook verified');
      return res.status(200).send(challenge);
    } else {
      return res.status(400).send('Bad Request');
    }
  }

  if (req.method === 'POST') {
    // Webhook event handler
    const body = req.body;
    console.log('📩 Received smart webhook:', JSON.stringify(body, null, 2));
    
    // Process webhook BEFORE responding
    processSmartWebhook(body)
      .then(() => {
        console.log('✅ Smart webhook processed successfully');
        res.status(200).send('OK');
      })
      .catch(error => {
        console.error('❌ Error processing smart webhook:', error);
        res.status(200).send('OK'); // Still respond OK
      });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

/**
 * Process smart webhook asynchronously
 */
async function processSmartWebhook(body) {
  try {
    console.log('🔄 Processing smart webhook...');
    
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    
    // Process messages
    if (value?.messages) {
      for (const message of value.messages) {
        await processMessage(message);
      }
    }
    
    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 Message status: ${status.status} for ${status.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in processSmartWebhook:', error);
    throw error;
  }
}

/**
 * Process individual message
 */
async function processMessage(message) {
  try {
    const from = message.from;
    const messageType = message.type;
    
    console.log(`📱 Message from ${from}: ${messageType}`);
    
    // Process text messages
    if (messageType === 'text') {
      const text = message.text.body;
      console.log(`💬 Text: "${text}"`);
      
      const conversation = new SmartConversation();
      await conversation.handleMessage(text, from);
    }
    
    // Process button replies
    else if (messageType === 'interactive' && message.interactive?.type === 'button_reply') {
      const buttonText = message.interactive.button_reply.title;
      console.log(`🔘 Button: "${buttonText}"`);
      
      // TODO: Handle button replies for incomplete info
      // This would continue the conversation flow
    }
    
    // Process other message types
    else {
      console.log(`⚠️ Unsupported message type: ${messageType}`);
    }
    
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}