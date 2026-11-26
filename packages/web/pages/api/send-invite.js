import { requireUser, rateLimit, isValidEmail, isShortText } from '../../lib/apiAuth.js';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin.js';

/**
 * POST /api/send-invite  (Authorization: Bearer <token>)
 * Invites someone to the CALLER's organization. organizationId/invitedBy in
 * the body are ignored (a different organizationId is rejected).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;
  if (!rateLimit(req, res, { key: `send-invite:${ctx.userId}`, limit: 10, windowMs: 60 * 60_000 })) return;

  try {
    const { email, name, role = 'member', splitPercentage = 50, color = '#6366F1' } = req.body || {};
    if (req.body?.organizationId && req.body.organizationId !== ctx.organizationId) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const organizationId = ctx.organizationId;
    const invitedBy = ctx.userId;

    if (!isValidEmail(email) || !isShortText(name, 120) || !organizationId) {
      return res.status(400).json({
        error: 'Email e name são obrigatórios'
      });
    }

    // Validar role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ 
        error: 'Role inválido. Deve ser: admin, member ou viewer' 
      });
    }

    // Verificar se o usuário que está convidando tem permissão
    const { data: inviter, error: inviterError } = await supabase
      .from('users')
      .select('id, name, email, organization_id, role')
      .eq('id', invitedBy)
      .eq('organization_id', organizationId)
      .single();

    if (inviterError || !inviter) {
      console.error('❌ Erro ao buscar inviter:', inviterError);
      return res.status(403).json({ 
        error: 'Usuário não encontrado ou não pertence à organização',
        details: inviterError?.message
      });
    }

    // Verificar role (relaxado: aceita admin, owner ou member durante onboarding)
    if (!['admin', 'owner', 'member'].includes(inviter.role)) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para convidar usuários',
        userRole: inviter.role
      });
    }

    // Buscar dados da organização
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, invite_code')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({ 
        error: 'Organização não encontrada' 
      });
    }

    // Verificar se o email já está na organização
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Este email já é membro da organização' 
      });
    }

    // Gerar código de convite único (10 caracteres para garantir compatibilidade)
    const generateInviteCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const inviteCode = generateInviteCode();
    
    console.log('📝 Dados do convite a serem inseridos:', {
      organization_id: organizationId,
      email: email,
      name: name,
      invited_by: invitedBy,
      role: role,
      invite_code: inviteCode,
      default_split_percentage: splitPercentage,
      color: color
    });
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br'}/signup-invite?email=${encodeURIComponent(email)}&invite_code=${inviteCode}`;

    // Deletar convites antigos/expirados deste email nesta organização
    console.log('🗑️ Removendo convites antigos para:', email);
    await supabase
      .from('pending_invites')
      .delete()
      .eq('organization_id', organizationId)
      .eq('email', email);

    // Salvar convite no banco usando a tabela pending_invites
    console.log('💾 Salvando convite no banco:', {
      organization_id: organizationId,
      email: email,
      name: name,
      invited_by: invitedBy,
      role: role,
      invite_code: inviteCode
    });

    // Preparar dados para inserção
    const inviteData = {
      organization_id: organizationId,
      email: email,
      name: name, // Salvar nome do convidado
      invited_by: invitedBy,
      role: role, // Salvar role do convite
      invite_code: inviteCode,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias - converter para ISO string
      default_split_percentage: parseFloat(splitPercentage) || 50.00, // Percentual de split
      color: color || '#6366F1' // Cor do perfil
    };

    console.log('💾 Tentando inserir convite com dados:', inviteData);

    const { error: inviteError } = await supabase
      .from('pending_invites')
      .insert(inviteData);

    if (inviteError) {
      console.error('❌ Erro ao salvar convite:', inviteError);
      console.error('❌ Detalhes completos do erro:', JSON.stringify(inviteError, null, 2));
      return res.status(500).json({ 
        error: 'Erro ao criar convite',
        details: inviteError.message,
        hint: inviteError.hint,
        code: inviteError.code,
        fullError: process.env.NODE_ENV === 'development' ? inviteError : undefined
      });
    }

    // Enviar email de convite via SendGrid
    console.log('📧 Enviando email via SendGrid para:', email);
    console.log('🔗 URL do convite:', inviteUrl);
    
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - MeuAzulão</title>
  <meta name="format-detection" content="telephone=no">
  <meta name="format-detection" content="date=no">
  <meta name="format-detection" content="address=no">
  <meta name="format-detection" content="email=no">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; min-height: 100vh;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: #E9EEF5; padding: 48px 40px; text-align: center; border-bottom: 3px solid #207DFF; border-radius: 24px 24px 0 0;">
              <h1 style="margin: 0; color: #207DFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                MeuAzulão
              </h1>
              <p style="margin: 8px 0 0 0; color: #0D2C66; font-size: 16px; font-weight: 500;">
                Você Foi Convidado!
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Olá!
              </p>
              <p style="margin: 0 0 32px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Você foi convidado para participar da organização <strong style="color: #207DFF;">${organization.name}</strong> no MeuAzulão.
              </p>

              <!-- Features Box -->
              <div style="background: linear-gradient(135deg, #E9EEF5 0%, #8FCBFF 100%); border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 2px solid #207DFF;">
                <p style="margin: 0 0 16px; color: #0D2C66; font-size: 16px; font-weight: 600;">
                  🎯 Com o MeuAzulão você pode:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #0D2C66; font-size: 14px; line-height: 1.8;">
                  <li>📱 Registrar despesas pelo WhatsApp com o Zul (IA)</li>
                  <li>📊 Ver gastos da família em tempo real</li>
                  <li>💡 Receber análises inteligentes dos seus gastos</li>
                  <li>🤝 Colaborar com todos os membros da família</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="${inviteUrl}" 
                       style="display: inline-block; background: #207DFF; color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(32, 125, 255, 0.3);">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <div style="border-left: 4px solid #207DFF; background: #E9EEF5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #0D2C66; font-size: 14px; line-height: 1.5;">
                  ℹ️ <strong>Primeira vez no MeuAzulão?</strong><br>
                  Ao aceitar, você criará sua conta e passará por um onboarding rápido para conhecer todas as funcionalidades.
                </p>
              </div>

              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Se você não esperava este convite, pode ignorar este email com segurança.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #E9EEF5; padding: 32px 40px; border-top: 3px solid #207DFF; border-radius: 0 0 24px 24px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 16px; color: #0D2C66; font-size: 16px; font-weight: 600;">
                      💙 MeuAzulão
                    </p>
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                      Controle financeiro inteligente para sua família
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © 2025 MeuAzulão. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;


    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: email }],
            subject: `Você foi convidado para ${organization.name} no MeuAzulão`
          }],
          from: { 
            email: 'noreply@meuazulao.com.br',
            name: 'MeuAzulão'
          },
          content: [{
            type: 'text/html',
            value: emailHtml
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
      }

      console.log('✅ Email enviado com sucesso via SendGrid!');
    } catch (emailError) {
      console.error('❌ Erro ao enviar email via SendGrid:', emailError);
      return res.status(500).json({ 
        error: 'Erro ao enviar email de convite',
        details: emailError.message || emailError
      });
    }

    res.status(200).json({
      success: true,
      message: 'Convite enviado com sucesso',
      inviteUrl: inviteUrl
    });

  } catch (error) {
    console.error('❌ Erro no send-invite:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
}
