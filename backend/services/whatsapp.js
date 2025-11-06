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
 * Enviar template de lembrete de contas a pagar via WhatsApp Business API
 * @param {string} to - Número de telefone do destinatário (com ou sem formatação)
 * @param {string} userName - Primeiro nome do usuário
 * @param {number} billsCount - Quantidade de contas
 * @param {string} dueDate - Data de vencimento formatada (DD/MM/YYYY)
 * @param {string} billsList - Lista de contas formatada (separada por \n)
 * @param {string} totalAmount - Valor total formatado (ex: "450,00")
 * @returns {Promise<boolean>} - true se enviado com sucesso, false caso contrário
 */
export async function sendBillReminderTemplate(to, userName, billsCount, dueDate, billsList, totalAmount) {
  const phoneId = process.env.PHONE_ID || process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token) {
    console.error('❌ Credenciais WhatsApp não configuradas');
    return false;
  }

  // Normalizar telefone (remover caracteres não numéricos)
  const normalizedTo = String(to || '').replace(/\D/g, '');

  const message = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'template',
    template: {
      name: 'bill_reminder_amanha',
      language: {
        code: 'pt_BR'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: userName // {{1}}
            },
            {
              type: 'text',
              text: String(billsCount) // {{2}}
            },
            {
              type: 'text',
              text: dueDate // {{3}}
            },
            {
              type: 'text',
              text: billsList // {{4}} - lista de contas com \n
            },
            {
              type: 'text',
              text: totalAmount // {{5}}
            }
          ]
        }
      ]
    }
  };

  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`✅ Template de lembrete enviado para ${normalizedTo}:`, response.data);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar template de lembrete:`, error.message);
    if (error.response) {
      console.error('📄 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
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
