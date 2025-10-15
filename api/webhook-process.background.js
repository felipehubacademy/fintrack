/**
 * Background processor for WhatsApp webhook
 * Runs outside the request/response lifecycle so it won't be killed after 200 OK
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const body = req.body;
    console.log('🎯 [BG] Received background webhook payload');

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (value?.messages?.length) {
      for (const message of value.messages) {
        console.log(`🎯 [BG] Processing message type=${message.type} from=${message.from}`);
        if (message.type === 'text') {
          try {
            const { SmartConversation } = await import('./_smartConversation.js');
            const smartConversation = new SmartConversation();
            await smartConversation.handleMessage(message.from, message.text?.body ?? '');
            console.log('🎯 [BG] SmartConversation handled the message');
          } catch (err) {
            console.error('❌ [BG] Error in SmartConversation:', err);
          }
        }
      }
    } else {
      console.log('🎯 [BG] No messages array in payload');
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ [BG] Background handler error:', error);
    return res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
}


