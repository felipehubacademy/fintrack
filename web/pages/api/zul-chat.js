export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId, userName, userPhone } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fazer requisição para o backend
    const backendUrl = process.env.BACKEND_URL || 'https://fintrack-backend-theta.vercel.app';
    const response = await fetch(`${backendUrl}/api/zul-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId: userId || 'web-user',
        userName: userName || 'Usuário Web',
        userPhone: userPhone || null
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Erro na API do Zul Chat:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente em alguns instantes.'
    });
  }
}
