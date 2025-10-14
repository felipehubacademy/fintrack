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
    const body = req.body;
    console.log('📩 Received Pluggy webhook:', JSON.stringify(body, null, 2));
    
    // Process webhook BEFORE responding
    processPluggyWebhook(body)
      .then(() => {
        console.log('✅ Pluggy webhook processed successfully');
        res.status(200).send('OK');
      })
      .catch(error => {
        console.error('❌ Error processing Pluggy webhook:', error);
        res.status(200).send('OK'); // Still respond OK
      });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

/**
 * Process Pluggy webhook asynchronously
 */
async function processPluggyWebhook(body) {
  try {
    console.log('🔄 Processing Pluggy webhook...');
    
    // Event: ITEM_UPDATE (connection status changed)
    if (body.event === 'item/updated' || body.type === 'ITEM_UPDATE') {
      const itemId = body.data?.id || body.itemId;
      const status = body.data?.status || body.status;
      
      console.log(`📊 Item ${itemId} status: ${status}`);
      
      if (status === 'UPDATED' || status === 'LOGIN_SUCCESS') {
        console.log('✅ New data available - triggering check...');
        
        // Trigger /check to process new transactions
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'https://fintrack-backend-theta.vercel.app';
        
        const response = await fetch(`${baseUrl}/check`);
        const result = await response.json();
        
        console.log('✅ Check completed:', result);
      }
    }
    
    // Event: TRANSACTIONS (new transactions detected - future Pluggy feature)
    if (body.event === 'transactions/created') {
      console.log('🆕 New transactions detected!');
      
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'https://fintrack-backend-theta.vercel.app';
      
      const response = await fetch(`${baseUrl}/check`);
      const result = await response.json();
      
      console.log('✅ Check completed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error in processPluggyWebhook:', error);
    throw error;
  }
}
