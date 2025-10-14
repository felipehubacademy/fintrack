import SmartConversation from '../backend/services/smartConversation.js';

/**
 * Webhook FinTrack V2 - Processamento Inteligente
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
  }

  return res.status(405).send('Method Not Allowed');
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
