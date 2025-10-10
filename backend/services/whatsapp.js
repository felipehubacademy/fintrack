import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Send transaction notification using approved template
 */
export async function sendTransactionNotification(transaction) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  
  // Números dos usuários (variáveis de ambiente - escalável)
  const phones = [
    process.env.USER_PHONE_FELIPE || process.env.USER_PHONE,
    process.env.USER_PHONE_LETICIA
  ].filter(Boolean); // Remove undefined/null

  // Format date
  const date = new Date(transaction.date);
  const formattedDate = date.toLocaleDateString('pt-BR');

  // Clean description (remove newlines, tabs, multiple spaces)
  const cleanDescription = transaction.description
    .replace(/[\n\r\t]/g, ' ')  // Remove newlines and tabs
    .replace(/\s{2,}/g, ' ')     // Replace multiple spaces with single space
    .trim();

  const results = [];

  // Enviar para os dois números
  for (const userPhone of phones) {
    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'template',
      template: {
        name: 'fintrack_despesa_cartao',
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: cleanDescription
              },
              {
                type: 'text',
                text: Math.abs(transaction.amount).toFixed(2)
              },
              {
                type: 'text',
                text: formattedDate
              }
            ]
          }
        ]
      }
    };

    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro ao enviar para ${userPhone}:`, errorText);
      // Continua para tentar enviar para o próximo número
    } else {
      const result = await response.json();
      results.push({
        phone: userPhone,
        messageId: result.messages[0].id
      });
      console.log(`✅ Mensagem enviada para ${userPhone}`);
    }
  }

  // Retorna o primeiro resultado (compatibilidade)
  return { messages: [{ id: results[0]?.messageId }] };
}

/**
 * Send a simple text message via WhatsApp
 */
export async function sendTextMessage(text) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const userPhone = process.env.USER_PHONE;

  const message = {
    messaging_product: 'whatsapp',
    to: userPhone,
    type: 'text',
    text: {
      body: text,
    },
  };

  const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp API error: ${errorText}`);
  }

  return await response.json();
}

/**
 * Send confirmation message using approved template
 */
export async function sendConfirmationMessage(owner, transaction, monthlyTotal) {
  console.log('📱 Iniciando envio de confirmação WhatsApp...');
  
  // FORÇAR Phone ID correto (Vercel tem um diferente!)
  const phoneId = '280543888475181'; // Phone ID correto que funciona
  const token = process.env.WHATSAPP_TOKEN;
  
  // Números dos usuários (variáveis de ambiente - escalável)
  const phones = [
    process.env.USER_PHONE_FELIPE || process.env.USER_PHONE,
    process.env.USER_PHONE_LETICIA
  ].filter(Boolean); // Remove undefined/null
  
  console.log(`📞 Phone ID: ${phoneId} (FORÇADO)`);
  console.log(`📱 Para: ${phones.join(', ')}`);
  console.log(`👤 Owner: ${owner}`);

  // Format date
  const date = new Date(transaction.date);
  const formattedDate = date.toLocaleDateString('pt-BR');

  const results = [];

  // Enviar para os dois números
  for (const userPhone of phones) {
    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'template',
      template: {
        name: 'fintrack_confirmacao',
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: transaction.amount.toString()
              },
              {
                type: 'text',
                text: owner
              },
              {
                type: 'text',
                text: formattedDate
              },
              {
                type: 'text',
                text: monthlyTotal.ownTotal
              },
              {
                type: 'text',
                text: monthlyTotal.sharedIndividual
              },
              {
                type: 'text',
                text: monthlyTotal.individualTotal
              }
            ]
          }
        ]
      }
    };

    console.log(`🌐 Enviando confirmação para ${userPhone}...`);
    
    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${phoneId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 7000, // 7 segundos
        }
      );

      console.log(`📡 Confirmação enviada para ${userPhone}: ${response.status}`);
      results.push({
        phone: userPhone,
        status: response.status
      });
    } catch (error) {
      console.error(`❌ ERRO ao enviar confirmação para ${userPhone}:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      // Continua para o próximo número
    }
  }

  console.log(`✅ Confirmações enviadas: ${results.length}/${phones.length}`);
  return { results };
}

/**
 * Parse button reply from webhook (template quick replies)
 */
export function parseButtonReply(webhookBody) {
  try {
    const entry = webhookBody.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const from = message?.from;

    // Parse button reply from template
    if (message?.type === 'button') {
      const buttonText = message.button?.text;
      const messageId = message.context?.id; // ID da mensagem template original
      
      console.log(`🔘 Button text received: "${buttonText}"`);
      
      let owner = null;
      if (buttonText === 'Felipe') owner = 'Felipe';
      else if (buttonText === 'Leticia' || buttonText === 'Letícia') owner = 'Leticia';
      else if (buttonText === 'Compartilhado') owner = 'Compartilhado';
      
      console.log(`👤 Owner parsed: ${owner}`);
      
      return {
        owner,
        from,
        messageId,
        buttonText
      };
    }

    // Fallback: parse text message
    if (message?.type === 'text') {
      const text = message.text.body.toLowerCase();
      let owner = null;
      
      if (text.includes('felipe')) owner = 'Felipe';
      else if (text.includes('leticia') || text.includes('letícia')) owner = 'Leticia';
      else if (text.includes('compartilhado')) owner = 'Compartilhado';
      
      return {
        owner,
        from,
        messageId: message.context?.id,
        buttonText: text
      };
    }
  } catch (error) {
    console.error('Error parsing button reply:', error);
  }
  
  return null;
}

