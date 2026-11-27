/**
 * API: Check Daily Engagement
 * Verifica usuários que não registraram despesas hoje e envia lembretes
 * 
 * Executa: Diariamente às 20h UTC (17h BRT)
 */

import { createClient } from '@supabase/supabase-js';
import EngagementAnalyzer from '../../../services/engagementAnalyzer.js';
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

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Cron only: Authorization: Bearer <CRON_SECRET> (constant-time compare)
  if (!requireCronSecret(req, res)) return;

  try {
    console.log('🔍 Iniciando verificação de engajamento diário...');

    const engagementAnalyzer = new EngagementAnalyzer();
    const zulMessages = new ZulMessages();

    // Buscar todas as organizações ativas
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true);

    if (orgError) throw orgError;

    const notifications = [];

    for (const organization of organizations || []) {
      console.log(`📊 Analisando engajamento da organização: ${organization.name}`);

      // Analisar engajamento de todos os usuários da organização
      const engagementData = await engagementAnalyzer.analyzeOrganizationEngagement(organization.id);

      for (const userData of engagementData) {
        const { user, engagement, needsReEngagement, optimalReminderTime } = userData;

        // Verificar se usuário precisa de re-engajamento
        if (!needsReEngagement) {
          console.log(`✅ Usuário ${user.name} não precisa de lembrete`);
          continue;
        }

        // Verificar se usuário tem WhatsApp cadastrado
        if (!user.phone) {
          console.log(`⚠️ Usuário ${user.name} não tem WhatsApp cadastrado`);
          continue;
        }

        // Verificar se é o horário ideal para enviar
        const now = new Date();
        const currentHour = now.getUTCHours();
        
        if (optimalReminderTime && Math.abs(currentHour - optimalReminderTime.hour) > 1) {
          console.log(`⏰ Não é o horário ideal para ${user.name} (ideal: ${optimalReminderTime.hour}h, atual: ${currentHour}h)`);
          continue;
        }

        // Gerar mensagem personalizada
        const message = engagementAnalyzer.generateReEngagementMessage(user.name, engagement);

        // Enviar WhatsApp
        console.log(`📱 Enviando lembrete para ${user.name} (${user.phone})`);
        const sent = await sendWhatsAppMessage(user.phone, message);

        // Registrar notificação
        if (sent) {
          // Criar notificação in-app
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              organization_id: organization.id,
              type: 'daily_reminder',
              title: 'Lembrete de Despesas',
              message: 'Que tal registrar suas despesas de hoje?',
              data: {
                engagement_level: engagement.level,
                streak: engagement.streak,
                last_activity: engagement.lastActivity
              },
              sent_via: 'whatsapp',
              priority: engagement.level === 'inactive' ? 'high' : 'normal'
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

          notifications.push({
            user_id: user.id,
            user_name: user.name,
            phone: user.phone,
            engagement_level: engagement.level,
            streak: engagement.streak,
            sent: true
          });

          console.log(`✅ Lembrete enviado para ${user.name}`);
        } else {
          console.log(`❌ Falha ao enviar lembrete para ${user.name}`);
          
          notifications.push({
            user_id: user.id,
            user_name: user.name,
            phone: user.phone,
            engagement_level: engagement.level,
            streak: engagement.streak,
            sent: false
          });
        }

        // Pequena pausa entre envios para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Verificação de engajamento concluída. ${notifications.length} notificações processadas.`);

    return res.status(200).json({
      success: true,
      message: `${notifications.length} lembretes de engajamento processados`,
      count: notifications.length,
      notifications: notifications.filter(n => n.sent),
      failed: notifications.filter(n => !n.sent).length
    });

  } catch (error) {
    console.error('❌ Erro ao processar engajamento diário:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
