export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {
    // Mock data for testing
    const mockData = {
      success: true,
      expenses: []
    };

    res.status(200).json(mockData);
  } else if (req.method === 'POST') {
    // Mock create expense
    const mockData = {
      success: true,
      expense: {
        id: 'mock-id',
        ...req.body
      }
    };

    res.status(201).json(mockData);
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
