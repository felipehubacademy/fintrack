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
      
      // Process webhook data asynchronously
      if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
        const change = body.entry[0].changes[0];
        
        if (change.value && change.value.messages && change.value.messages[0]) {
          const message = change.value.messages[0];
          const from = message.from;
          const messageType = message.type;
          
          console.log(`📱 Message from ${from}, type: ${messageType}`);
          
          // Handle text messages (user responses)
          if (messageType === 'text') {
            const text = message.text.body.toLowerCase();
            console.log(`💬 Text received: ${text}`);
            
            // Process user response
            if (text.includes('confirmar')) {
              console.log('✅ User confirmed transaction');
              // TODO: Update transaction as confirmed in Supabase
            } else if (text.includes('ignorar')) {
              console.log('❌ User ignored transaction');
              // TODO: Mark transaction as ignored in Supabase
            } else if (text.includes('editar')) {
              console.log('✏️ User wants to edit transaction');
              // TODO: Send category options to user
            } else {
              console.log('❓ Unknown response:', text);
            }
          }
          
          // Handle button replies (when template is approved)
          if (messageType === 'interactive') {
            const buttonReply = message.interactive.button_reply;
            console.log(`🔘 Button clicked: ${buttonReply.title}`);
            
            // Process button response
            if (buttonReply.title === 'Confirmar') {
              console.log('✅ User confirmed transaction via button');
              // TODO: Update transaction as confirmed in Supabase
            } else if (buttonReply.title === 'Ignorar') {
              console.log('❌ User ignored transaction via button');
              // TODO: Mark transaction as ignored in Supabase
            } else if (buttonReply.title === 'Editar') {
              console.log('✏️ User wants to edit transaction via button');
              // TODO: Send category options to user
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Don't send error response as we already responded with 200
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

