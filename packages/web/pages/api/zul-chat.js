import { requireUser, rateLimit } from '../../lib/apiAuth.js';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY = 40;

/**
 * POST /api/zul-chat  (Authorization: Bearer <token>)
 * Proxies the web chat to the Zul backend. The user and organization sent to
 * the backend come from the token, never from the body.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;
  if (!rateLimit(req, res, { key: `zul-chat:${ctx.userId}`, limit: 30, windowMs: 60_000 })) return;

  try {
    const { message, context, conversationHistory } = req.body || {};
    const useStream = req.query.stream === 'true';

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(413).json({ error: 'Message is too long' });
    }

    // Fazer requisição para o backend
    const backendUrl = process.env.BACKEND_URL || 'https://fintrack-backend-theta.vercel.app';
    const requestBody = {
      message,
      userId: ctx.userId,
      userName: ctx.profile.name || null,
      userPhone: ctx.profile.phone || null,
      organizationId: ctx.organizationId,
      context: context && typeof context === 'object' ? context : {},
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory.slice(-MAX_HISTORY) : [],
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
