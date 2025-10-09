import fetch from 'node-fetch';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Send transaction notification using approved template
 */
export async function sendTransactionNotification(transaction) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const userPhone = process.env.USER_PHONE;

  // Format date
  const date = new Date(transaction.date);
  const formattedDate = date.toLocaleDateString('pt-BR');

  const message = {
    messaging_product: 'whatsapp',
    to: userPhone,
    type: 'template',
    template: {
      name: 'fintrack_despesa_cartao',
      language: {
        code: 'pt_BR'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: transaction.description
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
    throw new Error(`WhatsApp API error: ${errorText}`);
  }

  return await response.json();
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
 * Send confirmation message with monthly total
 */
export async function sendConfirmationMessage(owner, transaction, monthlyTotal) {
  const text = `✅ Despesa confirmada!

💰 R$ ${transaction.amount} registrado para ${owner}
📅 ${new Date(transaction.date).toLocaleDateString('pt-BR')}
🏷️ ${transaction.description}

📊 Total de ${owner} em ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}:
• Gastos próprios: R$ ${monthlyTotal.ownTotal}
• Compartilhado (50%): R$ ${monthlyTotal.sharedIndividual}
• TOTAL: R$ ${monthlyTotal.individualTotal}`;

  return await sendTextMessage(text);
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
      
      let owner = null;
      if (buttonText === 'Felipe') owner = 'Felipe';
      else if (buttonText === 'Leticia') owner = 'Leticia';
      else if (buttonText === 'Compartilhado') owner = 'Compartilhado';
      
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

