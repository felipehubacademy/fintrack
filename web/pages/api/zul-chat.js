export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId, userName, userPhone, organizationId, context, conversationHistory } = req.body;
    const useStream = req.query.stream === 'true';

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('📥 [API ZUL] Recebendo requisição:', {
      message: message.substring(0, 50),
      hasContext: !!context,
      hasSummary: !!context?.summary,
      summaryBalance: context?.summary?.balance,
      month: context?.month,
      contextKeys: Object.keys(context || {}),
      historyLength: conversationHistory?.length || 0,
      useStream
    });

    // Fazer requisição para o backend
    const backendUrl = process.env.BACKEND_URL || 'https://fintrack-backend-theta.vercel.app';
    const requestBody = {
      message,
      userId: userId || 'web-user',
      userName: userName || 'Usuário Web',
      userPhone: userPhone || null,
      organizationId: organizationId || null,
      context: context || {}, // Passar contexto financeiro completo
      conversationHistory: conversationHistory || [] // Passar histórico de conversa
    };
    
    // Se streaming, repassar SSE
    if (useStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      try {
        const response = await fetch(`${backendUrl}/api/zul-chat?stream=true`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`);
        }

        // Repassar stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          res.write(chunk);
        }
        
        res.end();
        return;
        
      } catch (streamError) {
        console.error('Erro no streaming:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'Erro no streaming' })}\n\n`);
        res.end();
        return;
      }
    }
    
    // Modo não-streaming (fallback)
    console.log('📤 [API ZUL] Enviando para backend:', {
      hasContext: !!requestBody.context,
      hasSummary: !!requestBody.context?.summary,
      summaryBalance: requestBody.context?.summary?.balance,
      historyLength: requestBody.conversationHistory?.length || 0
    });
    
    const response = await fetch(`${backendUrl}/api/zul-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
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
