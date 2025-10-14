/**
 * Webhook Test - Sem dependências
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || req.query.challenge;
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(200).json({ status: 'webhook test ok' });
  }

  if (req.method === 'POST') {
    return res.status(200).json({ received: true });
  }

  return res.status(405).send('Method Not Allowed');
}
