import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ZUL WEB CHAT - Assistente Financeiro para Chat Web
 * 
 * Personalidade: Sábio Jovem - calmo, claro, curioso e inspirador
 * Tom: Próximo, pessoal e respeitoso (muito brasileiro!)
 * Formatação: Adequada para interface web (sem Markdown)
 */
class ZulWebChat {
  constructor() {
    // Nada aqui por enquanto
  }

  /**
   * Instruções para chat web (assistente financeiro geral)
   */
  getWebChatInstructions(context) {
    const { userName } = context;
    const firstName = userName ? userName.split(' ')[0] : 'você';
    
    return `Você é Zul, assistente financeiro do MeuAzulão.

PERSONALIDADE:
- Sábio, sereno e genuinamente prestativo
- Fale como um amigo inteligente ajudando com finanças
- Tom brasileiro, natural e respeitoso
- Seja conciso mas completo

SUA FUNÇÃO:
Você é um assistente financeiro geral que ajuda com:
- Dicas de controle financeiro
- Explicações sobre investimentos
- Orientações sobre orçamento
- Conceitos financeiros
- Estratégias de economia
- Planejamento financeiro

REGRAS:
- Responda perguntas financeiras de forma clara e didática
- Use exemplos práticos quando possível
- Seja encorajador e positivo
- Evite dar conselhos de investimento específicos (apenas educativos)
- Se não souber algo, seja honesto
- Use emojis ocasionalmente para tornar mais amigável

IMPORTANTE:
- NÃO registre despesas (isso é função do WhatsApp)
- Foque em educação e orientação financeira
- Seja útil e prático
- Mantenha o tom amigável e profissional

FORMATAÇÃO:
- Use formatação Markdown normalmente (**negrito**, *itálico*)
- Use números e símbolos para listas (1., 2., 3. ou •)
- O frontend vai converter a formatação para HTML

${firstName ? `\nUsuário atual: ${firstName}` : ''}`;
  }

  /**
   * Enviar mensagem para chat web (assistente financeiro geral)
   */
  async sendWebChatMessage(userId, userMessage, context = {}) {
    try {
      console.log('💬 [WEB CHAT] Iniciando conversa...');
      
      // Instruções específicas para chat web
      const systemMessage = this.getWebChatInstructions(context);
      
      // Preparar mensagens para GPT-4
      const messages = [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: userMessage
        }
      ];
      
      // Chamar GPT-4
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        top_p: 1.0,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        max_tokens: 500
      });
      
      const response = completion.choices[0].message.content;
      console.log('💬 [WEB CHAT] Resposta gerada');
      
      return response;
      
    } catch (error) {
      console.error('❌ [WEB CHAT] Erro:', error);
      throw error;
    }
  }
}

export default ZulWebChat;