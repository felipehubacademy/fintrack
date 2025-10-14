/**
 * Webhook FinTrack V2 - Versão Mínima para Debug
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
    
    // Simply acknowledge
    return res.status(200).send('OK');
  }

  return res.status(405).send('Method Not Allowed');
}
