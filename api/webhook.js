import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Webhook FinTrack V2 - Processa mensagens WhatsApp
 */
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    // Webhook verification (Meta format)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === 'fintrack_verify_token') {
      console.log('✅ Webhook verified (Meta format)');
      return res.status(200).send(challenge);
    } else if (req.query.challenge) {
      // Fallback for simple challenge
      console.log('✅ Webhook verified (simple format)');
      return res.status(200).send(req.query.challenge);
    } else {
      console.log('❌ Webhook verification failed');
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    // Webhook event handler
    const body = req.body;
    console.log('📩 Received webhook:', JSON.stringify(body, null, 2));
    
    // Process webhook
    processWebhook(body)
      .then(() => {
        console.log('✅ Webhook processed successfully');
        res.status(200).send('OK');
      })
      .catch(error => {
        console.error('❌ Error processing webhook:', error);
        res.status(200).send('OK'); // Still respond OK
      });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

/**
 * Process webhook messages
 */
async function processWebhook(body) {
  try {
    console.log('🔄 Processing webhook...');
    
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    // Process messages
    if (value?.messages) {
      for (const message of value.messages) {
        await processMessage(message);
      }
    }
    
    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 Status: ${status.status} for ${status.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in processWebhook:', error);
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
    
    if (messageType === 'text') {
      const text = message.text.body;
      console.log(`💬 Text: "${text}"`);
      
      // Responder com mensagem simples
      await sendWhatsAppMessage(from, 
        `✅ Mensagem recebida: "${text}"\n\nFinTrack V2 está funcionando! Em breve processaremos suas despesas com IA.`
      );
    }
    
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(to, text) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  const message = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: text }
  };

  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (error) {
    console.error(`❌ Error sending message:`, error.response?.data || error.message);
  }
}