import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, organizationId, invitedBy, role = 'member' } = req.body;

    if (!email || !name || !organizationId || !invitedBy) {
      return res.status(400).json({ 
        error: 'Email, name, organizationId e invitedBy são obrigatórios' 
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

    // Gerar código de convite único (8 caracteres)
    const generateInviteCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const inviteCode = generateInviteCode();
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br'}/invite/${inviteCode}`;

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

    const { error: inviteError } = await supabase
      .from('pending_invites')
      .insert({
        organization_id: organizationId,
        email: email,
        name: name, // Salvar nome do convidado
        invited_by: invitedBy,
        role: role, // Salvar role do convite
        invite_code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
      });

    if (inviteError) {
      console.error('❌ Erro ao salvar convite:', inviteError);
      return res.status(500).json({ 
        error: 'Erro ao criar convite',
        details: inviteError.message,
        code: inviteError.code
      });
    }

    // Enviar email de convite usando cliente admin
    console.log('📧 Tentando enviar email para:', email);
    console.log('🔗 URL do convite:', inviteUrl);
    
    const { data: emailData, error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_name: organization.name,
        inviter_name: inviter.name,
        invite_url: inviteUrl
      },
      redirectTo: inviteUrl
    });

    if (emailError) {
      console.error('❌ Erro COMPLETO ao enviar email:', JSON.stringify(emailError, null, 2));
      console.error('❌ Tipo do erro:', emailError.constructor.name);
      console.error('❌ Message:', emailError.message);
      console.error('❌ Status:', emailError.status);
      console.error('❌ Code:', emailError.code);
      return res.status(500).json({ 
        error: 'Erro ao enviar email de convite',
        details: emailError.message || emailError,
        status: emailError.status,
        code: emailError.code
      });
    }

    console.log('✅ Email enviado com sucesso!', emailData);

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
