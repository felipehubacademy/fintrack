import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Mail, Phone, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

export default function InvitePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { code } = router.query;
  const [invite, setInvite] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);

  // Formulário de cadastro
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [validation, setValidation] = useState({
    name: null,
    phone: null
  });

  useEffect(() => {
    if (code) {
      fetchInvite(code);
      checkUser();
    }
  }, [code]);

  const checkUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔍 Verificando usuário:', { user: user?.id, error });
    setUser(user);
  };

  const fetchInvite = async (inviteToken) => {
    try {
      setLoading(true);
      
      // Buscar convite
      const { data: inviteData, error: inviteError } = await supabase
        .from('pending_invites')
        .select(`
          *,
          organizations!inner(id, name),
          inviter:users!pending_invites_invited_by_fkey(name, email)
        `)
        .eq('invite_code', inviteToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError) {
        if (inviteError.code === 'PGRST116') {
          setError(t('web.invite.thisInviteIsInvalidExpired'));
        } else {
          throw inviteError;
        }
      } else {
        setInvite(inviteData);
        setOrganization(inviteData.organizations);
        
        // Preencher nome automaticamente
        if (inviteData.name) {
          setFormData(prev => ({ ...prev, name: inviteData.name }));
          setValidation(prev => ({ ...prev, name: validateName(inviteData.name) }));
        }
      }

    } catch (error) {
      console.error('❌ Erro ao buscar convite:', error);
      setError(t('web.invite.couldnTLoadTheInvite'));
    } finally {
      setLoading(false);
    }
  };

  // Formatar telefone automaticamente (apenas Brasil)
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11); // DDD (2) + Número (9)
    
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 2) {
      return `(${limited}`;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  // Validar nome
  const validateName = (name) => {
    return name.trim().length >= 2;
  };

  // Validar telefone (11 dígitos: DDD + número)
  const validatePhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 11;
  };

  // Handler para mudanças no formulário
  const handleChange = (field, value) => {
    if (field === 'phone') {
      const formatted = formatPhone(value);
      setFormData(prev => ({ ...prev, phone: formatted }));
      setValidation(prev => ({ ...prev, phone: validatePhone(formatted) }));
    } else if (field === 'name') {
      setFormData(prev => ({ ...prev, name: value }));
      setValidation(prev => ({ ...prev, name: validateName(value) }));
    }
  };

  const handleJoinOrganization = async (e) => {
    e.preventDefault();
    
    if (!user) {
      // Redirecionar para login
      router.push(`/login?redirect=/invite/${code}`);
      return;
    }

    try {
      setJoining(true);
      setError(null); // Limpar erros anteriores

      // Validação final
      if (!validation.phone) {
        setError(t('web.invite.invalidPhoneIncludeAreaCode'));
        setJoining(false);
        return;
      }

      console.log('📝 Dados a serem salvos:', {
        userId: user.id,
        email: user.email,
        name: formData.name,
        phone: formData.phone,
        organizationId: organization.id
      });

      // Verificar se usuário já está na organização
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar usuário:', checkError);
      }

      if (existingUser) {
        setError(t('web.invite.youReAlreadyInThis'));
        setJoining(false);
        return;
      }

      // Normalizar telefone: extrair apenas números e adicionar código do Brasil (55)
      const phoneNumbers = formData.phone.replace(/\D/g, ''); // Remove tudo que não é número
      const phoneWithCountryCode = `55${phoneNumbers}`; // Adiciona 55 no início
      
      // Inserir ou atualizar dados do usuário
      console.log('💾 Tentando inserir/atualizar usuário...');
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: formData.name.trim(),
          phone: phoneWithCountryCode, // Salvar como: 5511999999999 (55 + DDD + número)
          organization_id: organization.id,
          role: invite?.role || 'member',
          is_active: true
        }, {
          onConflict: 'id'
        });

      if (userError) {
        console.error('❌ Erro ao inserir usuário:', userError);
        throw userError;
      }
      
      console.log('✅ Usuário inserido/atualizado com sucesso!');

      // O trigger cria o cost_center automaticamente quando inserimos/atualizamos o usuário
      // Aguardar um pouco para garantir que o trigger executou
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Atualizar cost center com os valores do convite (split e cor escolhidos)
      const inviteSplit = invite?.default_split_percentage || 50.00;
      const inviteColor = invite?.color || '#6366F1';
      
      console.log('💾 Atualizando cost center com valores do convite...');
      const { error: costCenterError } = await supabase
        .from('cost_centers')
        .update({
          default_split_percentage: inviteSplit,
          color: inviteColor,
          name: formData.name.trim() // Garantir que o nome está correto e sem espaços extras
        })
        .eq('user_id', user.id)
        .eq('organization_id', organization.id);

      if (costCenterError) {
        console.error('⚠️ Erro ao atualizar cost center com valores do convite:', costCenterError);
        // Não falhar - o cost center já foi criado pelo trigger, só não terá os valores personalizados
      } else {
        console.log('✅ Cost center atualizado com valores do convite:', {
          split: inviteSplit,
          color: inviteColor
        });
      }

      // Remover convite da tabela pending_invites (já foi aceito)
      console.log('🗑️ Tentando deletar convite...');
      const { error: inviteError } = await supabase
        .from('pending_invites')
        .delete()
        .eq('invite_code', code);

      if (inviteError) {
        console.error('❌ Erro ao deletar convite:', inviteError);
        throw inviteError;
      }
      
      console.log('✅ Convite deletado com sucesso!');

      setSuccess(true);
      
      // Verificar se usuário já fez onboarding
      console.log('🎓 Verificando status de onboarding...');
      const { data: onboardingData } = await supabase
        .from('onboarding_progress')
        .select('is_completed')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();
      
      console.log('📊 Status de onboarding:', onboardingData);
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        if (onboardingData?.is_completed) {
          // Se já fez onboarding, vai direto para dashboard
          console.log('✅ Usuário já fez onboarding, redirecionando para dashboard...');
          window.location.href = `/org/${organization.id}/user/${user.id}/dashboard`;
        } else {
          // Se não fez, vai para onboarding
          console.log('🎓 Usuário não fez onboarding, redirecionando para onboarding...');
          window.location.href = `/org/${organization.id}/user/${user.id}/onboarding/1`;
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Erro ao entrar na organização:', error);
      
      // Mensagens amigáveis para o usuário
      let errorMessage = t('web.invite.couldnTJoinTheHousehold');
      
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        errorMessage = t('web.invite.youReAlreadyInThis2');
      } else if (error.message?.includes('organization_id')) {
        errorMessage = t('web.invite.couldnTLinkYouTo');
      } else if (error.message?.includes('invite')) {
        errorMessage = t('web.invite.thisInviteWasAlreadyUsed');
      }
      
      setError(errorMessage);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('web.invite.checkingInviteMeuazulao')}</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-fog-mist to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flight-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('web.invite.checkingYourInvite')}</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>{t('web.invite.invalidInviteMeuazulao')}</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
          
          {/* Gradient Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

          {/* Back to Home */}
          <Link 
            href="/"
            className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors z-10 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">{t('web.shared.back')}</span>
          </Link>

          {/* Error Card */}
          <div className="relative z-10 w-full max-w-lg">
            <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center mb-6">
                  <img 
                    src="/images/logo_flat.svg" 
                    alt="MeuAzulão" 
                    className="w-16 h-16"
                  />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {t('web.invite.invalidInvite')}
                </h1>
                <p className="text-gray-600">
                  {t('web.invite.weCanTUseThis')}
                </p>
              </div>

              {/* Error Message */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-900 font-semibold mb-2">
                      {t('web.invite.whatHappened')}
                    </h3>
                    <p className="text-red-800 text-sm leading-relaxed">
                      {error.includes('inválido') ? 
                        t('web.invite.thisInviteLinkIsnT') :
                        error.includes('expirado') ?
                        t('web.invite.thisInviteExpiredInvitesLast') :
                        error.includes('usado') ?
                        t('web.invite.thisInviteWasAlreadyUsed2') :
                        t('web.invite.weCanTUseThis2')
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                <h3 className="text-blue-900 font-semibold mb-3">
                  {t('web.invite.whatYouCanDo')}
                </h3>
                <ul className="text-blue-800 text-sm space-y-2">
                  <li>{t('web.invite.askWhoeverInvitedYouFor')}</li>
                  <li>{t('web.invite.checkTheLinkWasCopied')}</li>
                  <li>{t('web.invite.talkToYourHouseholdAdmin')}</li>
                </ul>
              </div>

              {/* Action Button */}
              <Link 
                href="/" 
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-center block"
              >
                {t('web.shared.backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Head>
          <title>{t('web.invite.inviteAcceptedMeuazulao')}</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
          
          {/* Gradient Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

          {/* Success Card */}
          <div className="relative z-10 w-full max-w-lg">
            <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center mb-6">
                  <img 
                    src="/images/logo_flat.svg" 
                    alt="MeuAzulão" 
                    className="w-16 h-16"
                  />
                </div>
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {t('web.invite.welcomeTo', { name: organization.name })}
                </h1>
                <p className="text-gray-600">
                  {t('web.invite.youReAllSignedUp')}
                </p>
              </div>

              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-lg">✅</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-green-900 font-semibold mb-2">
                      {t('web.invite.allSet')}
                    </h3>
                    <p className="text-green-800 text-sm leading-relaxed">
                      {t('web.invite.youVeJoinedTheHousehold')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Loading */}
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
                <p className="text-gray-600 text-sm mt-4">
                  {t('web.invite.redirecting')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t('web.invite.inviteToMeuazulao', { name: organization?.name })}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

        {/* Back to Home */}
        <Link 
          href="/"
          className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors z-10 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">{t('web.shared.back')}</span>
        </Link>

        {/* Form Card */}
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-6">
                <img 
                  src="/images/logo_flat.svg" 
                  alt="MeuAzulão" 
                  className="w-20 h-20"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('web.invite.inviteTo', { name: organization?.name })}
              </h1>
              <p className="text-gray-600 mb-6">
                {t('web.invite.youWereInvitedBy')} <strong>{invite?.inviter?.name}</strong>
              </p>
            </div>

            {/* Content */}
            {console.log('🎯 Renderizando com user:', user?.id, 'loading:', loading)}

            {user ? (
              <div>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  {t('web.invite.hi')} <strong>{invite?.name?.split(' ')[0]}</strong>{t('web.invite.fillInYourDetailsTo')}
                </p>
                
                <form onSubmit={handleJoinOrganization} className="space-y-6">
                  {/* Nome */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('web.invite.yourFullName')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        placeholder={t('web.shared.eGAlexSmith')}
                        required
                        readOnly
                        value={formData.name}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('web.invite.nameTakenFromTheInvite')}
                    </p>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('web.shared.yourWhatsapp')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        required
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-flight-blue focus:border-transparent transition-all ${
                          validation.phone === false ? 'border-red-500' : 
                          validation.phone === true ? 'border-green-500' : 
                          'border-gray-300'
                        }`}
                      />
                      {validation.phone !== null && (
                        <div className="absolute right-3 top-3">
                          {validation.phone ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('web.invite.includeYourCountryAndArea')}
                    </p>
                  </div>

                  {/* Erro */}
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* Botão */}
                  <button
                    type="submit"
                    disabled={joining || !validation.phone}
                    className="w-full bg-gradient-to-r from-flight-blue to-feather-blue text-white font-semibold py-3 px-4 rounded-xl hover:from-deep-sky hover:to-flight-blue focus:outline-none focus:ring-2 focus:ring-flight-blue focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    {joining ? t('web.invite.signingIn') : t('web.invite.joinHousehold')}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  {t('web.invite.createYourAccountToAccept')}
                </p>
                <div className="space-y-3">
                  <Link 
                    href={`/signup-invite?email=${invite?.email}&invite_code=${code}`}
                    className="w-full bg-gradient-to-r from-flight-blue to-feather-blue text-white py-3 px-6 rounded-xl hover:from-deep-sky hover:to-flight-blue inline-block text-center font-medium transition-all transform hover:scale-105"
                  >
                    {t('web.shared.create')}
                  </Link>
                  <Link 
                    href={`/login?redirect=/invite/${code}`}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 inline-block text-center font-medium transition-all"
                  >
                    {t('web.invite.iHaveAnAccountSign')}
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                {t('web.invite.byAcceptingYouLlSee')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
