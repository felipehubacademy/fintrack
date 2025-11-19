// Fetch accounts from Belvo API for a specific link
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { linkId } = req.query;

  if (!linkId) {
    return res.status(400).json({ error: 'Link ID is required' });
  }

  try {
    const secretId = process.env.BELVO_SECRET_ID;
    const secretPassword = process.env.BELVO_SECRET_PASSWORD;
    const apiUrl = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';

    if (!secretId || !secretPassword) {
      console.error('Belvo credentials not configured');
      return res.status(500).json({ error: 'Belvo credentials not configured' });
    }

    const auth = Buffer.from(`${secretId}:${secretPassword}`).toString('base64');

    console.log(`🔍 Fetching accounts for link: ${linkId}`);

    const response = await fetch(`${apiUrl}/api/accounts/?link=${linkId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Belvo API error:', response.status, errorText);
      return res.status(response.status).json({ 
        success: false,
        error: 'Failed to fetch accounts from Belvo' 
      });
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.results?.length || 0} accounts`);

    return res.status(200).json({
      success: true,
      accounts: data.results || []
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

