import { supabase } from '../../../lib/supabaseClient';
import { APP_CONFIG } from '../../../lib/constants';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios' 
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Email inválido' 
      });
    }

    // Buscar informações do usuário se estiver logado
    const authHeader = req.headers.authorization;
    let userId = null;
    let organizationId = null;
    let userRole = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, organization_id, role')
          .eq('id', user.id)
          .single();

        if (!userError && userData) {
          userId = userData.id;
          organizationId = userData.organization_id;
          userRole = userData.role;
        }
      }
    }

    // Preparar conteúdo do email
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitação de Suporte - MeuAzulão</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: #E9EEF5; padding: 48px 40px; text-align: center; border-bottom: 3px solid #207DFF; border-radius: 24px 24px 0 0;">
              <h1 style="margin: 0; color: #207DFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                MeuAzulão
              </h1>
              <p style="margin: 8px 0 0 0; color: #0D2C66; font-size: 16px; font-weight: 500;">
                Nova Solicitação de Suporte
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 14px; font-weight: 600;">
                  Nome:
                </p>
                <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px;">
                  ${name}
                </p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 14px; font-weight: 600;">
                  E-mail:
                </p>
                <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px;">
                  <a href="mailto:${email}" style="color: #207DFF; text-decoration: none;">
                    ${email}
                  </a>
                </p>
              </div>

              ${userId ? `
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 14px; font-weight: 600;">
                  Informações do Usuário:
                </p>
                <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px;">
                  ID: ${userId}<br>
                  Organização: ${organizationId || 'N/A'}<br>
                  Função: ${userRole || 'N/A'}
                </p>
              </div>
              ` : ''}

              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 14px; font-weight: 600;">
                  Assunto:
                </p>
                <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px;">
                  ${subject}
                </p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 14px; font-weight: 600;">
                  Mensagem:
                </p>
                <div style="background: #f9fafb; border-left: 4px solid #207DFF; padding: 16px; border-radius: 8px; margin-top: 8px;">
                  <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                    ${message}
                  </p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #E9EEF5; padding: 32px 40px; border-top: 3px solid #207DFF; border-radius: 0 0 24px 24px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; color: #0D2C66; font-size: 14px;">
                      MeuAzulão - Controle financeiro inteligente
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} MeuAzulão. Todos os direitos reservados.
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

    // Enviar email via SendGrid
    const supportEmail = process.env.SUPPORT_EMAIL || APP_CONFIG.NOTIFICATION_EMAILS.SUPPORT;
    
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: supportEmail }],
            subject: `[Suporte] ${subject} - ${name}`
          }],
          from: { 
            email: 'noreply@meuazulao.com.br',
            name: 'MeuAzulão - Suporte'
          },
          reply_to: {
            email: email,
            name: name
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

      console.log('✅ Email de suporte enviado com sucesso via SendGrid!');
    } catch (emailError) {
      console.error('❌ Erro ao enviar email via SendGrid:', emailError);
      // Não retornar erro ao usuário, apenas logar
      // O email pode falhar mas não devemos impedir o envio do formulário
    }

    res.status(200).json({
      success: true,
      message: 'Mensagem enviada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no send-support:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
}

