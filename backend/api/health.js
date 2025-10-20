/**
 * Vercel Serverless Function for Health Check
 */
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'MeuAzulão Backend',
      version: '1.0.0'
    });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
