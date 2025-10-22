import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, organizationId, invitedBy } = req.body;

    if (!email || !organizationId || !invitedBy) {
      return res.status(400).json({ 
        error: 'Email, organizationId e invitedBy são obrigatórios' 
      });
    }

    // Verificar se o usuário que está convidando tem permissão
    const { data: inviter, error: inviterError } = await supabase
      .from('users')
      .select('id, name, email, organization_id, role')
      .eq('id', invitedBy)
      .eq('organization_id', organizationId)
      .in('role', ['admin', 'owner'])
      .single();

    if (inviterError || !inviter) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para convidar usuários' 
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
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${inviteCode}`;

    // Salvar convite no banco usando a tabela pending_invites
    const { error: inviteError } = await supabase
      .from('pending_invites')
      .insert({
        organization_id: organizationId,
        email: email,
        invited_by: invitedBy,
        invite_code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
      });

    if (inviteError) {
      console.error('❌ Erro ao salvar convite:', inviteError);
      return res.status(500).json({ 
        error: 'Erro ao criar convite' 
      });
    }

    // Enviar email de convite
    const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_name: organization.name,
        inviter_name: inviter.name,
        invite_url: inviteUrl
      },
      redirectTo: inviteUrl
    });

    if (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      return res.status(500).json({ 
        error: 'Erro ao enviar email de convite' 
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
