/**
 * API: Send Weekly Report
 * Gera e envia relatório semanal com insights
 * 
 * Executa: Domingos às 21h UTC (18h BRT)
 */

import { createClient } from '@supabase/supabase-js';
import ZulMessages from '../../../services/zulMessages.js';
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

// Calcular início da semana (domingo)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// Calcular fim da semana (sábado)
function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Cron only: Authorization: Bearer <CRON_SECRET> (constant-time compare)
  if (!requireCronSecret(req, res)) return;

  try {
    console.log('📊 Iniciando geração de relatório semanal...');

    const zulMessages = new ZulMessages();
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);

    // Buscar todas as organizações ativas
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true);

    if (orgError) throw orgError;

    const reports = [];

    for (const organization of organizations || []) {
      console.log(`📈 Gerando relatório para organização: ${organization.name}`);

      try {
        // Buscar dados da semana atual usando função SQL
        const { data: weekData, error: weekError } = await supabase.rpc('get_weekly_summary', {
          org_id: organization.id,
          week_start_date: weekStart.toISOString().split('T')[0]
        });

        if (weekError) {
          console.error('Erro ao buscar dados semanais:', weekError);
          continue;
        }

        if (!weekData || weekData.length === 0) {
          console.log(`⚠️ Nenhum dado encontrado para ${organization.name}`);
          continue;
        }

        const weekSummary = weekData[0];
        const { total_spent, category_totals, cost_center_totals, expense_count } = weekSummary;

        // Buscar dados da semana anterior para comparação
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(weekEnd);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

        const { data: prevWeekData } = await supabase.rpc('get_weekly_summary', {
          org_id: organization.id,
          week_start_date: prevWeekStart.toISOString().split('T')[0]
        });

        const prevWeekSummary = prevWeekData && prevWeekData.length > 0 ? prevWeekData[0] : null;
        const prevTotalSpent = prevWeekSummary ? prevWeekSummary.total_spent : 0;

        // Calcular mudança percentual
        const changePercent = prevTotalSpent > 0 ? 
          ((total_spent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

        // Preparar top categorias
        const topCategories = [];
        if (category_totals) {
          const categories = Object.entries(category_totals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
          
          categories.forEach(([name, amount], index) => {
            const percentage = total_spent > 0 ? (amount / total_spent) * 100 : 0;
            topCategories.push({
              name,
              amount,
              percentage: percentage.toFixed(1),
              emoji: getCategoryEmoji(name)
            });
          });
        }

        // Buscar usuários da organização que devem receber relatório
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, phone')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .not('phone', 'is', null);

        if (usersError) {
          console.error('Erro ao buscar usuários:', usersError);
          continue;
        }

        // Verificar se já foi enviado relatório esta semana
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const { data: existingReports } = await supabase
          .from('notification_history')
          .select('id')
          .eq('user_id', users[0]?.id)
          .eq('channel', 'whatsapp')
          .gte('sent_at', `${weekStartStr}T00:00:00`)
          .like('delivery_status', 'sent');

        if (existingReports && existingReports.length > 0) {
          console.log(`⚠️ Relatório semanal já enviado esta semana para ${organization.name}`);
          continue;
        }

        // Enviar relatório para todos os usuários
        for (const user of users || []) {
          try {
            // Gerar mensagem de relatório
            const message = zulMessages.weeklyReport(
              user.name,
              total_spent,
              topCategories,
              {
                percentChange: changePercent,
                previousTotal: prevTotalSpent
              }
            );

            // Enviar WhatsApp
            console.log(`📱 Enviando relatório semanal para ${user.name}`);
            const sent = await sendWhatsAppMessage(user.phone, message);

            if (sent) {
              // Criar notificação in-app
              const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                  user_id: user.id,
                  organization_id: organization.id,
                  type: 'weekly_report',
                  title: 'Relatório Semanal',
                  message: `Total gasto: R$ ${total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  data: {
                    week_start: weekStart.toISOString().split('T')[0],
                    week_end: weekEnd.toISOString().split('T')[0],
                    total_spent,
                    expense_count,
                    change_percent: changePercent,
                    top_categories: topCategories
                  },
                  sent_via: 'whatsapp',
                  priority: 'normal'
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

              reports.push({
                user_id: user.id,
                user_name: user.name,
                organization_name: organization.name,
                total_spent,
                expense_count,
                change_percent: changePercent.toFixed(1),
                sent: true
              });

              console.log(`✅ Relatório enviado para ${user.name}`);
            } else {
              console.log(`❌ Falha ao enviar relatório para ${user.name}`);
              
              reports.push({
                user_id: user.id,
                user_name: user.name,
                organization_name: organization.name,
                total_spent,
                expense_count,
                change_percent: changePercent.toFixed(1),
                sent: false
              });
            }

            // Pequena pausa entre envios
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (userError) {
            console.error(`Erro ao processar usuário ${user.name}:`, userError);
          }
        }

      } catch (orgError) {
        console.error(`Erro ao processar organização ${organization.name}:`, orgError);
      }
    }

    console.log(`✅ Geração de relatório semanal concluída. ${reports.length} relatórios processados.`);

    return res.status(200).json({
      success: true,
      message: `${reports.length} relatórios semanais processados`,
      count: reports.length,
      reports: reports.filter(r => r.sent),
      failed: reports.filter(r => !r.sent).length
    });

  } catch (error) {
    console.error('❌ Erro ao processar relatório semanal:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

// Função auxiliar para emoji de categoria
function getCategoryEmoji(categoryName) {
  const emojis = {
    'Alimentação': '🍽️',
    'Supermercado': '🛒',
    'Mercado': '🛒',
    'Transporte': '🚗',
    'Combustível': '⛽',
    'Saúde': '💊',
    'Farmácia': '💊',
    'Beleza': '💄',
    'Lazer': '🎉',
    'Contas': '📄',
    'Casa': '🏠',
    'Educação': '📚',
    'Vestuário': '👕',
    'Outros': '💰'
  };
  
  return emojis[categoryName] || '💰';
}
