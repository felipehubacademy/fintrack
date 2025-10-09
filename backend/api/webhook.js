import dotenv from 'dotenv';

dotenv.config();

/**
 * Vercel Serverless Function for WhatsApp Webhook
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
    try {
      const body = req.body;
      console.log('📩 Received webhook:', JSON.stringify(body, null, 2));
      
      // Quickly respond to WhatsApp to avoid timeout
      res.status(200).send('OK');
      
      // TODO: Process webhook data (parse button reply, update expense, etc.)
      
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Don't send error response as we already responded with 200
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

