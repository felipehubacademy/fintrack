// Web chat only needs the Chat Completions assistant. The old ZulAssistant
// (Assistants API, shut down by OpenAI) is no longer imported here.
import ZulWebChat from '../services/zulWebChat.js';

const webChat = new ZulWebChat();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar se é streaming request
    const useStream = req.query.stream === 'true' || req.headers['accept']?.includes('text/event-stream');
    
    const { message, userId, userName, userPhone, organizationId, context, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Usar dados padrão se não fornecidos
    const userIdFinal = userId || 'web-user';
    const userNameFinal = userName || 'Usuário Web';

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
    const contextToPass = context && Object.keys(context).length > 0 
      ? { organizationId: organizationId || null, ...context }
      : { organizationId: organizationId || null };
    
    // Adicionar histórico de conversa ao contexto
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      contextToPass.conversationHistory = conversationHistory;
    }
    
    // Se streaming, retornar SSE
    if (useStream) {
      // Configurar headers para SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Desabilitar buffering no nginx
      
      try {
        // Usar streaming do webChat
        const stream = webChat.sendWebChatMessageStream(
          userIdFinal,
          message,
          { userName: userNameFinal, ...contextToPass }
        );
        
        // Enviar chunks via SSE
        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        
        // Enviar evento de fim
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        
      } catch (streamError) {
        console.error('❌ Erro no streaming:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'Erro no streaming' })}\n\n`);
        res.end();
      }
      
      return;
    }

    // Modo não-streaming (fallback)
    console.log('📤 [BACKEND API] Contexto sendo passado para processMessage:', {
      hasContext: Object.keys(contextToPass).length > 1,
      contextKeys: Object.keys(contextToPass),
      hasSummary: !!contextToPass.summary,
      summaryBalance: contextToPass.summary?.balance,
      historyLength: contextToPass.conversationHistory?.length || 0
    });
    
    const reply = await webChat.sendWebChatMessage(
      userIdFinal,
      message,
      { userName: userNameFinal, ...contextToPass }
    );

    return res.status(200).json({
      success: true,
      message: reply,
      threadId: null,
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

