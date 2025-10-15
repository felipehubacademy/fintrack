/**
 * Webhook FinTrack V2 - Versão mínima funcional (root /api)
 */

// Process webhook asynchronously
async function processWebhook(body) {
  console.log('🔄 [DEBUG] Starting processWebhook...');
  try {
    const entry = body.entry?.[0];
    console.log('🔄 [DEBUG] Entry:', entry ? 'found' : 'not found');
    
    const change = entry?.changes?.[0];
    console.log('🔄 [DEBUG] Change:', change ? 'found' : 'not found');
    
    const value = change?.value;
    console.log('🔄 [DEBUG] Value:', value ? 'found' : 'not found');

    // Process messages
    if (value?.messages) {
      console.log('🔄 [DEBUG] Messages found:', value.messages.length);
      for (const message of value.messages) {
        console.log('🔄 [DEBUG] Message type:', message.type);
        if (message.type === 'text') {
          console.log(`📱 Processing message from ${message.from}: "${message.text.body}"`);
          
          try {
            console.log('🔄 [DEBUG] Importing SmartConversation...');
            // Import SmartConversation dynamically to reduce cold start
            const { SmartConversation } = await import('./_smartConversation.js');
            console.log('🔄 [DEBUG] SmartConversation imported successfully');
            
            console.log('🔄 [DEBUG] Creating SmartConversation instance...');
            const smartConversation = new SmartConversation();
            console.log('🔄 [DEBUG] SmartConversation instance created');
            
            console.log('🔄 [DEBUG] Calling handleMessage...');
            // Process the message with SmartConversation
            await smartConversation.handleMessage(message.from, message.text.body);
            console.log('🔄 [DEBUG] handleMessage completed');
            
            console.log('💬 Message processed successfully');
          } catch (smartError) {
            console.error('❌ [DEBUG] Error in SmartConversation:', smartError);
            console.error('❌ [DEBUG] Error stack:', smartError.stack);
          }
        }
      }
    } else {
      console.log('🔄 [DEBUG] No messages found in value');
    }

    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 Message status: ${status.status} for ${status.id}`);
      }
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    console.error('❌ Error stack:', error.stack);
  }
  console.log('🔄 [DEBUG] processWebhook completed');
}

export default async function handler(req, res) {
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
    console.log('🚀 [WEBHOOK] POST received - VERSION 3.0 (DISPATCH to BG)');
    try {
      console.log('📩 Received webhook:', JSON.stringify(req.body, null, 2));

      // Dispatch to background function to avoid being killed after 200 OK
      const bgUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/webhook-process`;
      await fetch(bgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }).then(async (r) => {
        console.log('🚚 [WEBHOOK] Dispatched to BG:', r.status);
        const txt = await r.text().catch(() => '');
        if (txt) console.log('🚚 [WEBHOOK] BG response:', txt);
      }).catch((err) => {
        console.error('❌ [WEBHOOK] Failed to dispatch to BG:', err);
      });

      console.log('📤 [WEBHOOK] Returning 200 OK');
      return res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Webhook error:', error);
      console.error('❌ Error stack:', error?.stack);
      return res.status(500).send('Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
}
