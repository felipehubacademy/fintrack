import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Criar cliente Supabase com service role para API routes
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Enviar template de lembrete de contas via WhatsApp Business API
 */
async function sendBillReminderTemplate(to, userName, billsCount, dueDate, billsList, totalAmount) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

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
 * Formatar data para DD/MM/YYYY
 */
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formatar lista de contas para o template
 * 
 * IMPORTANTE: Usa \n (quebra de linha) que será interpretado pelo WhatsApp
 * O preview do template pode mostrar \n literalmente, mas funciona corretamente no envio
 */
function formatBillsList(bills) {
  const maxBills = 10;
  // Usa \n que será interpretado como quebra de linha pelo WhatsApp API
  let billsList = bills
    .slice(0, maxBills)
    .map(bill => bill.description)
    .join('\n');

  if (bills.length > maxBills) {
    billsList += `\n... e mais ${bills.length - maxBills} conta(s)`;
  }

  return billsList;
}

/**
 * Obter primeiro nome do usuário
 */
function getFirstName(fullName) {
  if (!fullName) return 'aí';
  return fullName.split(' ')[0];
}

/**
 * API Endpoint: Check Bills Due Tomorrow
 * Verifica contas a pagar vencendo amanhã e envia notificações via WhatsApp usando template
 * Chamado 2x por dia pelo GitHub Actions (cron job) - 8h e 20h BRT
 */
export default async function handler(req, res) {
  // Permitir CORS para requisições do GitHub Actions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Permitir preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log para debug
  console.log('📥 [check-bills-due-tomorrow] Recebendo requisição:', {
    method: req.method,
    url: req.url,
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'missing',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  });

  // Verificar método
  if (req.method !== 'POST') {
    console.log('❌ [check-bills-due-tomorrow] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  // Verificar autenticação via secret
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ [check-bills-due-tomorrow] Unauthorized: missing or invalid auth header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.error('❌ [check-bills-due-tomorrow] CRON_SECRET não configurado no Vercel');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (token !== expectedSecret) {
    console.log('❌ [check-bills-due-tomorrow] Invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }

  console.log('✅ [check-bills-due-tomorrow] Autenticação OK, processando...');

  try {
    // Calcular data de amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando contas vencendo amanhã (${tomorrowStr})...`);

    // Buscar contas vencendo amanhã que ainda não foram notificadas hoje
    // Lógica: notified_at deve ser null ou anterior a hoje (para permitir notificação diária)
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        *,
        organization:organizations(id, name),
        user:users(id, name, email, whatsapp_phone)
      `)
      .in('status', ['pending', 'overdue'])
      .eq('due_date', tomorrowStr)
      .or(`notified_at.is.null,notified_at.lt.${todayStr}`);

    if (billsError) {
      console.error('❌ Erro ao buscar contas:', billsError);
      throw billsError;
    }

    console.log(`📋 Encontradas ${bills?.length || 0} contas vencendo amanhã`);

    if (!bills || bills.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma conta vencendo amanhã',
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

      if (!user.whatsapp_phone) {
        console.log(`⚠️ Usuário ${user.name} não tem WhatsApp cadastrado`);
        continue;
      }

      // Preparar dados para o template
      const firstName = getFirstName(user.name);
      const billsCount = userBills.length;
      const dueDate = formatDate(tomorrowStr);
      const billsList = formatBillsList(userBills);
      
      // Calcular valor total
      const totalAmount = userBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
      const totalAmountFormatted = totalAmount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      // Enviar template via WhatsApp
      console.log(`📱 Enviando template de lembrete para ${user.whatsapp_phone}...`);
      console.log(`   - Nome: ${firstName}`);
      console.log(`   - Contas: ${billsCount}`);
      console.log(`   - Data: ${dueDate}`);
      console.log(`   - Lista de contas (com \\n): ${billsList.replace(/\n/g, '\\n')}`);
      console.log(`   - Total: R$ ${totalAmountFormatted}`);

      const sent = await sendBillReminderTemplate(
        user.whatsapp_phone,
        firstName,
        billsCount,
        dueDate,
        billsList,
        totalAmountFormatted
      );

      // Atualizar notified_at apenas se envio foi bem-sucedido
      if (sent) {
        const billIds = userBills.map(b => b.id);
        const { error: updateError } = await supabase
          .from('bills')
          .update({ notified_at: new Date().toISOString() })
          .in('id', billIds);

        if (updateError) {
          console.error(`❌ Erro ao atualizar notified_at:`, updateError);
        }
      }

      notifications.push({
        user_id: userId,
        user_name: user.name,
        bills_count: billsCount,
        phone: user.whatsapp_phone,
        total_amount: totalAmount,
        sent: sent
      });
    }

    const successCount = notifications.filter(n => n.sent).length;
    console.log(`✅ ${successCount}/${notifications.length} notificações enviadas com sucesso`);

    return res.status(200).json({
      success: true,
      message: `${successCount} notificações enviadas`,
      count: successCount,
      total: notifications.length,
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

