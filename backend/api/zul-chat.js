import ZulAssistant from '../services/zulAssistant.js';

const zul = new ZulAssistant();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log completo do body recebido
    console.log('📥 [BACKEND API] Body completo recebido:', {
      hasBody: !!req.body,
      bodyKeys: Object.keys(req.body || {}),
      contextKeys: Object.keys(req.body?.context || {}),
      contextType: typeof req.body?.context,
      contextIsArray: Array.isArray(req.body?.context),
      contextValue: req.body?.context ? JSON.stringify(req.body.context).substring(0, 200) : 'null'
    });
    
    const { message, userId, userName, userPhone, organizationId, context, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Usar dados padrão se não fornecidos
    const userIdFinal = userId || 'web-user';
    const userNameFinal = userName || 'Usuário Web';
    const userPhoneFinal = userPhone || null;

    console.log(`💬 Zul Chat - Usuário: ${userNameFinal} (${userIdFinal})`);
    console.log(`📝 Mensagem: ${message}`);
    console.log(`📊 Contexto financeiro recebido:`, {
      hasContext: !!context,
      contextType: typeof context,
      contextKeys: Object.keys(context || {}),
      hasSummary: !!context?.summary,
      summaryBalance: context?.summary?.balance,
      month: context?.month
    });

    // Processar mensagem com o Zul, passando contexto completo
    // Se context é um objeto vazio, usar objeto vazio. Se tem dados, espalhar
    const contextToPass = context && Object.keys(context).length > 0 
      ? { organizationId: organizationId || null, ...context }
      : { organizationId: organizationId || null };
    
    // Adicionar histórico de conversa ao contexto
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      contextToPass.conversationHistory = conversationHistory;
    }
    
    console.log('📤 [BACKEND API] Contexto sendo passado para processMessage:', {
      hasContext: Object.keys(contextToPass).length > 1,
      contextKeys: Object.keys(contextToPass),
      hasSummary: !!contextToPass.summary,
      summaryBalance: contextToPass.summary?.balance,
      historyLength: contextToPass.conversationHistory?.length || 0
    });
    
    const response = await zul.processMessage(
      message,
      userIdFinal,
      userNameFinal,
      userPhoneFinal,
      contextToPass
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

