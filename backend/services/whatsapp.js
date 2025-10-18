import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Enviar mensagem de texto via WhatsApp
 */
export async function sendTextMessage(phoneNumberId, to, message) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Processar resposta de botão do WhatsApp
 */
export function parseButtonReply(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    
    if (!messages || messages.length === 0) {
      return null;
    }

    const message = messages[0];
    const buttonReply = message.interactive?.button_reply;
    
    if (buttonReply) {
      return {
        messageId: message.id,
        from: message.from,
        buttonId: buttonReply.id,
        buttonTitle: buttonReply.title,
        timestamp: message.timestamp
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao processar resposta de botão:', error);
    return null;
  }
}
