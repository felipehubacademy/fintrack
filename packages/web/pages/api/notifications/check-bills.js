import { supabase } from '../../../lib/supabaseClient';
import axios from 'axios';
import { getBrazilTodayString } from '../../../lib/dateUtils';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Enviar mensagem WhatsApp usando a API oficial da Meta
 */
async function sendWhatsAppMessage(to, text) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneId || !token) {
    console.error('❌ [WHATSAPP] Credenciais não configuradas (PHONE_ID ou WHATSAPP_TOKEN)');
    return false;
  }

  // Normalize phone format (WhatsApp não usa +)
  const normalizedTo = String(to || '').replace(/\D/g, '');

  const message = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'text',
    text: {
      body: text,
    },
  };

  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    console.log(`✅ Mensagem enviada para ${normalizedTo}:`, response.data);
    return true;
  } catch (error) {
    // Detectar token expirado (401)
    if (error.response?.status === 401) {
      const authHeader = error.response.headers?.['www-authenticate'] || '';
      if (authHeader.includes('expired')) {
        console.error('🔐 [WHATSAPP] TOKEN EXPIRADO! Atualize o WHATSAPP_TOKEN nas variáveis de ambiente.');
        console.error('📋 [WHATSAPP] Detalhes:', authHeader);
      } else {
        console.error('🔐 [WHATSAPP] Token inválido ou não autorizado.');
      }
    } else {
      console.error(`❌ [WHATSAPP] Erro ao enviar mensagem:`, error.message);
      if (error.response?.data) {
        console.error('📄 [WHATSAPP] Detalhes do erro:', JSON.stringify(error.response.data));
      }
    }
    return false;
  }
}

/**
 * API Endpoint: Check Bills Due Today
 * Verifica contas a pagar vencendo hoje e envia notificações via WhatsApp
 * Chamado diariamente pelo GitHub Actions (cron job)
 */
export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticação via secret
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Usar fuso horário do Brasil
    const today = getBrazilTodayString();

    // Buscar contas vencendo hoje que ainda não foram notificadas
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        *,
        organization:organizations(id, name),
        user:users(id, name, email, phone)
      `)
      .eq('status', 'pending')
      .eq('due_date', today)
      .or(`notified_at.is.null,notified_at.lt.${today}`);

    if (billsError) {
      console.error('❌ Erro ao buscar contas:', billsError);
      throw billsError;
    }

    console.log(`📋 Encontradas ${bills?.length || 0} contas vencendo hoje`);

    if (!bills || bills.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma conta vencendo hoje',
        count: 0
      });
    }

    // Agrupar contas por usuário
    const billsByUser = {};
    bills.forEach(bill => {
      const userId = bill.user_id;
      if (!billsByUser[userId]) {
        billsByUser[userId] = {
          user: bill.user,
          organization: bill.organization,
          bills: []
        };
      }
      billsByUser[userId].bills.push(bill);
    });

    const notifications = [];

    // Enviar notificações para cada usuário
    for (const userId in billsByUser) {
      const { user, organization, bills: userBills } = billsByUser[userId];

      if (!user.phone) {
        console.log(`⚠️ Usuário ${user.name} não tem WhatsApp cadastrado`);
        continue;
      }

      // Criar mensagem
      let message = `🔔 *Lembretes de Contas a Pagar* 📅\n\n`;
      message += `Olá, ${user.name}! `;
      message += userBills.length === 1 
        ? `Você tem 1 conta vencendo hoje:\n\n`
        : `Você tem ${userBills.length} contas vencendo hoje:\n\n`;

      userBills.forEach((bill, index) => {
        message += `${index + 1}. *${bill.description}*\n`;
        message += `   💰 R$ ${Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
      });

      message += `Acesse o MeuAzulão para registrar o pagamento! ✅\n`;
      message += `${process.env.NEXT_PUBLIC_APP_URL || 'https://meuazulao.com.br'}/dashboard/bills`;

      // Enviar WhatsApp usando a API oficial da Meta
      console.log(`📱 Enviando notificação para ${user.phone}:`);
      const sent = await sendWhatsAppMessage(user.phone, message);

      // Atualizar notified_at
      const billIds = userBills.map(b => b.id);
      await supabase
        .from('bills')
        .update({ notified_at: new Date().toISOString() })
        .in('id', billIds);

      notifications.push({
        user_id: userId,
        user_name: user.name,
        bills_count: userBills.length,
        phone: user.phone,
        sent: sent
      });
    }

    console.log(`✅ ${notifications.length} notificações enviadas com sucesso`);

    return res.status(200).json({
      success: true,
      message: `${notifications.length} notificações enviadas`,
      count: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('❌ Erro ao processar notificações:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

