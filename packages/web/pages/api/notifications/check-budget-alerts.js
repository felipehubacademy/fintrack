/**
 * API: Check Budget Alerts
 * Verifica orçamentos próximos/ultrapassados e envia alertas
 * 
 * Executa: 3x ao dia (8h, 14h, 20h UTC)
 */

import { createClient } from '@supabase/supabase-js';
import ZulMessages from '../../../services/zulMessages.js';
import { getBrazilTodayString } from '../../../lib/dateUtils';
import { requireCronSecret } from '../../../lib/apiAuth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Função para enviar mensagem WhatsApp
async function sendWhatsAppMessage(phone, message) {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro ao enviar WhatsApp:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro na função sendWhatsAppMessage:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Cron only: Authorization: Bearer <CRON_SECRET> (constant-time compare)
  if (!requireCronSecret(req, res)) return;

  try {
    console.log('🔍 Iniciando verificação de alertas de orçamento...');

    const zulMessages = new ZulMessages();
    // Usar fuso horário do Brasil
    const today = getBrazilTodayString();
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // Buscar todos os orçamentos ativos do mês atual
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        *,
        category:budget_categories(name, color),
        organization:organizations(id, name)
      `)
      .eq('is_active', true)
      .like('month_year', `${currentMonth}%`);

    if (budgetError) throw budgetError;

    const alerts = [];

    for (const budget of budgets || []) {
      try {
        // Calcular uso do orçamento usando a função SQL
        const { data: usageData, error: usageError } = await supabase.rpc('get_budget_usage', {
          org_id: budget.organization_id,
          cat_id: budget.category_id,
          month_year: currentMonth
        });

        if (usageError) {
          console.error('Erro ao calcular uso do orçamento:', usageError);
          continue;
        }

        if (!usageData || usageData.length === 0) continue;

        const usage = usageData[0];
        const { budget_limit, spent_amount, usage_percentage } = usage;

        // Verificar se precisa de alerta
        const alertThresholds = [80, 90, 100, 110];
        const needsAlert = alertThresholds.some(threshold => 
          usage_percentage >= threshold && usage_percentage < threshold + 5
        );

        if (!needsAlert) continue;

        // Buscar usuários da organização que devem receber alertas
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, phone')
          .eq('organization_id', budget.organization_id)
          .eq('is_active', true)
          .not('phone', 'is', null);

        if (usersError) {
          console.error('Erro ao buscar usuários:', usersError);
          continue;
        }

        // Verificar se já foi enviado alerta para este orçamento hoje
        // Usar fuso horário do Brasil (já calculado acima)
        const { data: existingAlerts } = await supabase
          .from('notification_history')
          .select('id')
          .eq('user_id', users[0]?.id)
          .eq('channel', 'whatsapp')
          .gte('sent_at', `${today}T00:00:00`)
          .like('delivery_status', 'sent');

        if (existingAlerts && existingAlerts.length > 0) {
          console.log(`⚠️ Alerta já enviado hoje para orçamento ${budget.category.name}`);
          continue;
        }

        // Enviar alertas para todos os usuários
        for (const user of users || []) {
          try {
            // Gerar mensagem de alerta
            const message = zulMessages.budgetAlert(
              user.name,
              budget.category.name,
              usage_percentage,
              spent_amount,
              budget_limit
            );

            // Enviar WhatsApp
            console.log(`📱 Enviando alerta de orçamento para ${user.name}`);
            const sent = await sendWhatsAppMessage(user.phone, message);

            if (sent) {
              // Criar notificação in-app
              const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                  user_id: user.id,
                  organization_id: budget.organization_id,
                  type: 'budget_alert',
                  title: `Alerta de Orçamento - ${budget.category.name}`,
                  message: `${budget.category.name}: ${usage_percentage.toFixed(1)}% usado`,
                  data: {
                    category_id: budget.category_id,
                    category_name: budget.category.name,
                    budget_limit,
                    spent_amount,
                    usage_percentage,
                    alert_level: usage_percentage >= 100 ? 'critical' : 
                               usage_percentage >= 90 ? 'high' : 'medium'
                  },
                  sent_via: 'whatsapp',
                  priority: usage_percentage >= 100 ? 'urgent' : 
                           usage_percentage >= 90 ? 'high' : 'normal'
                });

              if (notificationError) {
                console.error('Erro ao criar notificação:', notificationError);
              }

              // Registrar histórico de envio
              const { error: historyError } = await supabase
                .from('notification_history')
                .insert({
                  user_id: user.id,
                  sent_at: new Date().toISOString(),
                  delivery_status: 'sent',
                  channel: 'whatsapp'
                });

              if (historyError) {
                console.error('Erro ao registrar histórico:', historyError);
              }

              alerts.push({
                user_id: user.id,
                user_name: user.name,
                category_name: budget.category.name,
                usage_percentage: usage_percentage.toFixed(1),
                budget_limit,
                spent_amount,
                sent: true
              });

              console.log(`✅ Alerta enviado para ${user.name}`);
            } else {
              console.log(`❌ Falha ao enviar alerta para ${user.name}`);
              
              alerts.push({
                user_id: user.id,
                user_name: user.name,
                category_name: budget.category.name,
                usage_percentage: usage_percentage.toFixed(1),
                budget_limit,
                spent_amount,
                sent: false
              });
            }

            // Pequena pausa entre envios
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (userError) {
            console.error(`Erro ao processar usuário ${user.name}:`, userError);
          }
        }

      } catch (budgetError) {
        console.error(`Erro ao processar orçamento ${budget.category?.name}:`, budgetError);
      }
    }

    console.log(`✅ Verificação de alertas de orçamento concluída. ${alerts.length} alertas processados.`);

    return res.status(200).json({
      success: true,
      message: `${alerts.length} alertas de orçamento processados`,
      count: alerts.length,
      alerts: alerts.filter(a => a.sent),
      failed: alerts.filter(a => !a.sent).length
    });

  } catch (error) {
    console.error('❌ Erro ao processar alertas de orçamento:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
