/**
 * Vercel Serverless Function for Health Check
 */
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === 'fintrack_verify_token') {
      console.log('✅ Webhook verified');
      return res.status(200).send(challenge);
    } else if (challenge) {
      console.log('✅ Webhook verified (simple)');
      return res.status(200).send(challenge);
    } else {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'FinTrack Backend',
        version: '1.0.0'
      });
    }
  } else if (req.method === 'POST') {
    const body = req.body;
    console.log('📩 Received webhook:', JSON.stringify(body, null, 2));
    return res.status(200).send('OK');
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
