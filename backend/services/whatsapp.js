import fetch from 'node-fetch';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Send an interactive button message via WhatsApp
 */
export async function sendTransactionNotification(transaction, expenseId) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const userPhone = process.env.USER_PHONE;

  const message = {
    messaging_product: 'whatsapp',
    to: userPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `💳 Nova transação detectada:\n\n${transaction.description}\nR$ ${Math.abs(transaction.amount).toFixed(2)}\n\nDe quem é essa despesa?`,
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `${expenseId}_felipe`,
              title: 'Felipe',
            },
          },
          {
            type: 'reply',
            reply: {
              id: `${expenseId}_leticia`,
              title: 'Letícia',
            },
          },
          {
            type: 'reply',
            reply: {
              id: `${expenseId}_shared`,
              title: 'Compartilhado',
            },
          },
        ],
      },
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
 * Parse button reply from webhook
 */
export function parseButtonReply(webhookBody) {
  try {
    const entry = webhookBody.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message?.type === 'interactive' && message?.interactive?.type === 'button_reply') {
      const buttonId = message.interactive.button_reply.id;
      const [expenseId, owner] = buttonId.split('_');
      
      return {
        expenseId: parseInt(expenseId),
        owner: owner === 'shared' ? 'Compartilhado' : owner.charAt(0).toUpperCase() + owner.slice(1),
        split: owner === 'shared',
      };
    }
  } catch (error) {
    console.error('Error parsing button reply:', error);
  }
  
  return null;
}

