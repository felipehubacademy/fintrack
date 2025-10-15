/**
 * Webhook FinTrack V2 - Versão mínima funcional (root /api)
 */

// Process webhook asynchronously
async function processWebhook(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Process messages
    if (value?.messages) {
      for (const message of value.messages) {
        if (message.type === 'text') {
          console.log(`📱 Processing message from ${message.from}: "${message.text.body}"`);
          
          // TODO: Integrate SmartConversation here
          // For now, just log the message
          console.log('💬 Message processed successfully');
        }
      }
    }

    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 Message status: ${status.status} for ${status.id}`);
      }
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
  }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'fintrack_verify_token') {
      return res.status(200).send(challenge);
    }
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      console.log('📩 Received webhook:', JSON.stringify(req.body, null, 2));
      
      // Process webhook asynchronously
      processWebhook(req.body);
    } catch (error) {
      console.error('❌ Webhook error:', error);
    }
    return res.status(200).send('OK');
  }

  return res.status(405).send('Method Not Allowed');
}
