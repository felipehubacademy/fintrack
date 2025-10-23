import { supabase } from '../../../lib/supabaseClient';

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
    const today = new Date();
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay();
    const todayISO = today.toISOString().split('T')[0];

    // Buscar metas ativas
    const { data: goals, error: goalsError } = await supabase
      .from('investment_goals')
      .select(`
        *,
        organization:organizations(id, name),
        user:users(id, name, email, whatsapp_phone)
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

      if (!user.whatsapp_phone) {
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

      message += `Acesse o FinTrack para registrar seu aporte! 📈\n`;
      message += `${process.env.NEXT_PUBLIC_APP_URL || 'https://fintrack.app'}/dashboard/investments`;

      // Enviar WhatsApp (implementar integração real aqui)
      console.log(`📱 Enviando notificação para ${user.whatsapp_phone}:`);
      console.log(message);

      // TODO: Implementar envio real via WhatsApp API
      // await sendWhatsAppMessage(user.whatsapp_phone, message);

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
        phone: user.whatsapp_phone
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

