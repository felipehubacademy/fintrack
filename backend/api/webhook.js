/**
 * Webhook FinTrack V2 (backend/api) - VERSION B1 (SYNC MINIMAL)
 * Este arquivo é implantado quando o projeto Vercel está com Root Directory = backend
 */

// Process webhook synchronously com logs detalhados
async function processWebhook(body) {
  console.log('🔄 [B1][DEBUG] Starting processWebhook...');
  try {
    const entry = body.entry?.[0];
    console.log('🔄 [B1][DEBUG] Entry:', entry ? 'found' : 'not found');

    const change = entry?.changes?.[0];
    console.log('🔄 [B1][DEBUG] Change:', change ? 'found' : 'not found');

    const value = change?.value;
    console.log('🔄 [B1][DEBUG] Value:', value ? 'found' : 'not found');

    // Process messages
    if (value?.messages) {
      console.log('🔄 [B1][DEBUG] Messages found:', value.messages.length);
      for (const message of value.messages) {
        console.log('🔄 [B1][DEBUG] Message type:', message.type);
        if (message.type === 'text') {
          console.log(`📱 [B1] Processing message from ${message.from}: "${message.text.body}"`);

          try {
            // Fast path para testes: evitar processamento pesado em payloads de teste
            if (message.id?.includes('test_') || process.env.WEBHOOK_DRY_RUN === '1') {
              console.log('🧪 [B1][DEBUG] Dry-run/test payload detected. Skipping SmartConversation.');
              continue;
            }

            console.log('🔄 [B1][DEBUG] Importing SmartConversation...');
            // Import dinâmico a partir de backend/services (um nível acima)
            const { default: SmartConversation } = await import('../services/smartConversation.js');
            console.log('🔄 [B1][DEBUG] SmartConversation imported successfully');

            console.log('🔄 [B1][DEBUG] Creating SmartConversation instance...');
            const smartConversation = new SmartConversation();
            console.log('🔄 [B1][DEBUG] SmartConversation instance created');

            console.log('🔄 [B1][DEBUG] Calling handleMessage...');
            console.log(`🔍 [B1][DEBUG] useAssistant flag: ${smartConversation.useAssistant}`);
            console.log(`🔍 [B1][DEBUG] USE_ZUL_ASSISTANT env: ${process.env.USE_ZUL_ASSISTANT}`);
            
            await smartConversation.handleMessage(message.text.body, message.from);
            console.log('🔄 [B1][DEBUG] handleMessage completed');

            console.log('💬 [B1] Message processed successfully');
          } catch (smartError) {
            console.error('❌ [B1][DEBUG] Error in SmartConversation:', smartError);
            console.error('❌ [B1][DEBUG] Error stack:', smartError?.stack);
          }
        }
      }
    } else {
      console.log('🔄 [B1][DEBUG] No messages found in value');
    }

    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 [B1] Message status: ${status.status} for ${status.id}`);
      }
    }

  } catch (error) {
    console.error('❌ [B1] Error processing webhook:', error);
    console.error('❌ [B1] Error stack:', error?.stack);
  }
  console.log('🔄 [B1][DEBUG] processWebhook completed');
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
    console.log('🚀 [B1][WEBHOOK] POST received - VERSION B1 (SYNC MINIMAL)');
    try {
      console.log('📩 [B1] Received webhook:', JSON.stringify(req.body, null, 2));
      console.log('🔄 [B1][WEBHOOK] Calling processWebhook (minimal)...');
      await processWebhook(req.body);
      console.log('✅ [B1] Minimal processing completed');
      return res.status(200).send('OK');
    } catch (error) {
      console.error('❌ [B1] Webhook error:', error);
      console.error('❌ [B1] Error stack:', error?.stack);
      return res.status(500).send('Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
}


