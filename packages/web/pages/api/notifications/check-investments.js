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
 * API Endpoint: Check Investment Goals
 * Verifica metas de investimento que precisam de lembrete hoje
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
    const todayISO = getBrazilTodayString();
    const today = new Date(todayISO + 'T00:00:00');
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay();

    // Buscar metas ativas
    const { data: goals, error: goalsError } = await supabase
      .from('investment_goals')
      .select(`
        *,
        organization:organizations(id, name),
        user:users(id, name, email, phone)
      `)
      .eq('is_active', true)
      .or(`last_notified_at.is.null,last_notified_at.lt.${todayISO}`);

    if (goalsError) {
      console.error('❌ Erro ao buscar metas:', goalsError);
      throw goalsError;
    }

    console.log(`🎯 Encontradas ${goals?.length || 0} metas ativas`);

    if (!goals || goals.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma meta ativa',
        count: 0
      });
    }

    // Filtrar metas que precisam de lembrete hoje
    const goalsDueToday = goals.filter(goal => {
      if (goal.frequency === 'monthly') {
        return goal.due_day === dayOfMonth;
      } else if (goal.frequency === 'weekly') {
        return goal.due_day === dayOfWeek;
      } else if (goal.frequency === 'biweekly') {
        // Para quinzenal, due_day pode ser "5,20" (string)
        const days = goal.due_day.toString().split(',').map(d => parseInt(d.trim()));
        return days.includes(dayOfMonth);
      }
      return false;
    });

    console.log(`📅 ${goalsDueToday.length} metas precisam de lembrete hoje`);

    if (goalsDueToday.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma meta precisa de lembrete hoje',
        count: 0
      });
    }

    // Agrupar metas por usuário
    const goalsByUser = {};
    for (const goal of goalsDueToday) {
      // Buscar contribuições do mês atual
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const { data: contributions } = await supabase
        .from('investment_contributions')
        .select('*')
        .eq('goal_id', goal.id)
        .eq('confirmed', true)
        .gte('date', startOfMonth);

      const monthlyContributed = (contributions || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const progress = (monthlyContributed / Number(goal.target_amount)) * 100;

      const userId = goal.user_id;
      if (!goalsByUser[userId]) {
        goalsByUser[userId] = {
          user: goal.user,
          organization: goal.organization,
          goals: []
        };
      }
      goalsByUser[userId].goals.push({
        ...goal,
        monthlyContributed,
        progress
      });
    }

    const notifications = [];

    // Enviar notificações para cada usuário
    for (const userId in goalsByUser) {
      const { user, organization, goals: userGoals } = goalsByUser[userId];

      if (!user.phone) {
        console.log(`⚠️ Usuário ${user.name} não tem WhatsApp cadastrado`);
        continue;
      }

      // Criar mensagem
      let message = `🎯 *Lembretes de Investimento* 💰\n\n`;
      message += `Olá, ${user.name}! `;
      message += userGoals.length === 1 
        ? `Hoje é dia do seu aporte:\n\n`
        : `Hoje é dia de ${userGoals.length} aportes:\n\n`;

      userGoals.forEach((goal, index) => {
        message += `${index + 1}. *${goal.name}*\n`;
        message += `   💰 Meta: R$ ${Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        message += `   📊 Progresso: ${goal.progress.toFixed(1)}%\n`;
        
        if (goal.progress >= 100) {
          message += `   ✅ *Meta atingida!* Parabéns!\n\n`;
        } else {
          const remaining = Number(goal.target_amount) - goal.monthlyContributed;
          message += `   🎯 Falta: R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
        }
      });

      message += `Acesse o MeuAzulão para registrar seu aporte! 📈\n`;
      message += `${process.env.NEXT_PUBLIC_APP_URL || 'https://meuazulao.com.br'}/dashboard/investments`;

      // Enviar WhatsApp usando a API oficial da Meta
      console.log(`📱 Enviando notificação para ${user.phone}:`);
      const sent = await sendWhatsAppMessage(user.phone, message);

      // Atualizar last_notified_at
      const goalIds = userGoals.map(g => g.id);
      await supabase
        .from('investment_goals')
        .update({ last_notified_at: new Date().toISOString() })
        .in('id', goalIds);

      notifications.push({
        user_id: userId,
        user_name: user.name,
        goals_count: userGoals.length,
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

