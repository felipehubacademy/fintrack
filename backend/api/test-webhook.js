export default function handler(req, res) {
  console.log('🔔 Test webhook called!');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  
  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  });
}

