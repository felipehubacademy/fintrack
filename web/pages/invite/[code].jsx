import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Mail, Phone, User, CheckCircle, AlertCircle } from 'lucide-react';

export default function InvitePage() {
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
    const { data: { user } } = await supabase.auth.getUser();
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
          setError('Convite inválido, expirado ou já foi usado');
        } else {
          throw inviteError;
        }
      } else {
        setInvite(inviteData);
        setOrganization(inviteData.organizations);
      }

    } catch (error) {
      console.error('❌ Erro ao buscar convite:', error);
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  };

  // Formatar telefone automaticamente
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 13);
    
    if (limited.length <= 2) {
      return `+${limited}`;
    } else if (limited.length <= 4) {
      return `+${limited.slice(0, 2)} (${limited.slice(2)}`;
    } else if (limited.length <= 9) {
      return `+${limited.slice(0, 2)} (${limited.slice(2, 4)}) ${limited.slice(4)}`;
    } else {
      return `+${limited.slice(0, 2)} (${limited.slice(2, 4)}) ${limited.slice(4, 9)}-${limited.slice(9)}`;
    }
  };

  // Validar nome
  const validateName = (name) => {
    return name.trim().length >= 2;
  };

  // Validar telefone
  const validatePhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 13;
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

      // Validações finais
      if (!validation.name) {
        setError('Nome deve ter pelo menos 2 caracteres');
        return;
      }
      if (!validation.phone) {
        setError('Telefone inválido. Use formato: +55 (11) 99999-9999');
        return;
      }

      // Verificar se usuário já está na organização
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (existingUser) {
        setError('Você já é membro desta organização');
        return;
      }

      // Normalizar telefone antes de salvar (apenas números)
      const normalizedPhone = formData.phone.replace(/\D/g, '');
      
      // Atualizar dados do usuário
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: normalizedPhone, // Salvar apenas números: 5511999999999
          organization_id: organization.id,
          role: 'member',
          is_active: true
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Remover convite da tabela pending_invites (já foi aceito)
      const { error: inviteError } = await supabase
        .from('pending_invites')
        .delete()
        .eq('invite_code', code);

      if (inviteError) throw inviteError;

      setSuccess(true);
      
      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('❌ Erro ao entrar na organização:', error);
      setError('Erro ao entrar na organização');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Verificando Convite - MeuAzulão</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-fog-mist to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flight-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Verificando convite...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Convite Inválido - MeuAzulão</title>
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
            <span className="font-medium">Voltar</span>
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
                    className="w-20 h-20"
                  />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Convite Inválido
                </h1>
                <p className="text-gray-600">
                  Este convite não pode ser processado
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
                      O que aconteceu?
                    </h3>
                    <p className="text-red-800 text-sm leading-relaxed">
                      {error.includes('inválido') ? 
                        'Este link de convite não é válido ou foi gerado incorretamente.' :
                        error.includes('expirado') ?
                        'Este convite expirou. Convites são válidos por 7 dias.' :
                        error.includes('usado') ?
                        'Este convite já foi utilizado. Cada convite só pode ser usado uma vez.' :
                        'Este convite não pode ser processado no momento.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                <h3 className="text-blue-900 font-semibold mb-3">
                  💡 O que você pode fazer?
                </h3>
                <ul className="text-blue-800 text-sm space-y-2">
                  <li>• Peça um novo convite para quem te convidou</li>
                  <li>• Verifique se o link foi copiado corretamente</li>
                  <li>• Entre em contato com o administrador da organização</li>
                </ul>
              </div>

              {/* Action Button */}
              <Link 
                href="/" 
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-center block"
              >
                Voltar ao Início
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
          <title>Convite Aceito - MeuAzulão</title>
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
                    className="w-20 h-20"
                  />
                </div>
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Bem-vindo à {organization.name}!
                </h1>
                <p className="text-gray-600">
                  Seu cadastro foi concluído com sucesso
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
                      Tudo certo!
                    </h3>
                    <p className="text-green-800 text-sm leading-relaxed">
                      Você foi adicionado com sucesso à organização. Você será redirecionado para o dashboard em instantes.
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
                  Redirecionando...
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
        <title>Convite para {organization?.name} - MeuAzulão</title>
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
          <span className="font-medium">Voltar</span>
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
                Convite para {organization?.name}
              </h1>
              <p className="text-gray-600 mb-4">
                Você foi convidado por <strong>{invite?.inviter?.name}</strong>
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Convidado por:</p>
                <p className="font-medium text-gray-900">{invite?.inviter?.name}</p>
              </div>
            </div>

            {/* Content */}

            {user ? (
              <div>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  Olá, <strong>{user.email}</strong>! Complete seus dados para entrar na organização.
                </p>
                
                <form onSubmit={handleJoinOrganization} className="space-y-6">
                  {/* Nome */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Seu Nome Completo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        placeholder="Ex: João Silva"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-flight-blue focus:border-transparent transition-all ${
                          validation.name === false ? 'border-red-500' : 
                          validation.name === true ? 'border-green-500' : 
                          'border-gray-300'
                        }`}
                      />
                      {validation.name !== null && (
                        <div className="absolute right-3 top-3">
                          {validation.name ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Seu WhatsApp
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="+55 (11) 99999-9999"
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
                      Digite apenas números, formataremos automaticamente
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
                    disabled={joining || !validation.name || !validation.phone}
                    className="w-full bg-gradient-to-r from-flight-blue to-feather-blue text-white font-semibold py-3 px-4 rounded-xl hover:from-deep-sky hover:to-flight-blue focus:outline-none focus:ring-2 focus:ring-flight-blue focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    {joining ? 'Entrando...' : 'Entrar na Organização'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  Crie sua conta para aceitar o convite
                </p>
                <div className="space-y-3">
                  <Link 
                    href={`/signup-invite?email=${invite?.email}&invite_code=${code}`}
                    className="w-full bg-gradient-to-r from-flight-blue to-feather-blue text-white py-3 px-6 rounded-xl hover:from-deep-sky hover:to-flight-blue inline-block text-center font-medium transition-all transform hover:scale-105"
                  >
                    Criar Conta
                  </Link>
                  <Link 
                    href={`/login?redirect=/invite/${code}`}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 inline-block text-center font-medium transition-all"
                  >
                    Já tenho conta - Fazer Login
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Ao aceitar este convite, você terá acesso aos dados financeiros 
                compartilhados desta organização.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
