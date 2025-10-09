import dotenv from 'dotenv';

dotenv.config();

/**
 * Vercel Serverless Function for Pluggy Webhook
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
      console.log('✅ Pluggy webhook verified');
      return res.status(200).send(challenge);
    } else {
      return res.status(400).send('Bad Request');
    }
  }

  if (req.method === 'POST') {
    // Webhook event handler
    try {
      const body = req.body;
      console.log('📩 Received Pluggy webhook:', JSON.stringify(body, null, 2));
      
      // Quickly respond to Pluggy to avoid timeout
      res.status(200).send('OK');
      
      // Process webhook data
      if (body.type === 'ITEM_UPDATE') {
        const itemId = body.itemId;
        const status = body.status;
        
        console.log(`🔄 Item ${itemId} status changed to: ${status}`);
        
        if (status === 'OUTDATED') {
          console.log('⚠️ Connection expired - needs renewal');
          // TODO: Implement automatic renewal logic
        } else if (status === 'ACTIVE') {
          console.log('✅ Connection is now active');
          // TODO: Trigger transaction sync
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing Pluggy webhook:', error);
      // Don't send error response as we already responded with 200
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
