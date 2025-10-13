export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {
    // Mock data for testing
    const mockData = {
      success: true,
      summary: {
        total: 0,
        felipe: 0,
        leticia: 0,
        compartilhado: 0,
        fatura_total: 0
      },
      expenses: []
    };

    res.status(200).json(mockData);
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
