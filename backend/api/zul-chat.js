import ZulAssistant from '../services/zulAssistant.js';

const zul = new ZulAssistant();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId, userName, userPhone } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Usar dados padrão se não fornecidos
    const userIdFinal = userId || 'web-user';
    const userNameFinal = userName || 'Usuário Web';
    const userPhoneFinal = userPhone || null;

    console.log(`💬 Zul Chat - Usuário: ${userNameFinal} (${userIdFinal})`);
    console.log(`📝 Mensagem: ${message}`);

    // Processar mensagem com o Zul
    const response = await zul.processMessage(
      message,
      userIdFinal,
      userNameFinal,
      userPhoneFinal
    );

    console.log(`🤖 Resposta do Zul: ${response.message}`);

    return res.status(200).json({
      success: true,
      message: response.message,
      threadId: response.threadId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no chat do Zul:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente em alguns instantes.'
    });
  }
}
