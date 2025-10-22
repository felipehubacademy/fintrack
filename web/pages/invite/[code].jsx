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

      // Atualizar dados do usuário
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
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
        <div className="min-h-screen bg-gradient-to-br from-fog-mist to-gray-100 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-red-500 text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-deep-sky mb-4">Convite Inválido</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link 
                href="/" 
                className="bg-gradient-to-r from-flight-blue to-feather-blue text-white px-6 py-3 rounded-xl hover:from-deep-sky hover:to-flight-blue inline-block transition-all"
              >
                Voltar ao início
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
        <div className="min-h-screen bg-gradient-to-br from-fog-mist to-gray-100 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-green-500 text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-deep-sky mb-4">Bem-vindo à {organization.name}!</h1>
              <p className="text-gray-600 mb-6">
                Seu cadastro foi concluído com sucesso. Você será redirecionado para o dashboard em instantes.
              </p>
              <div className="animate-pulse">
                <div className="w-8 h-8 border-4 border-flight-blue border-t-transparent rounded-full mx-auto"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-fog-mist to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-block mb-4">
                <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-deep-sky transition-colors" />
              </Link>
              
              <div className="inline-block p-4 bg-gradient-to-r from-flight-blue to-feather-blue rounded-2xl mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-deep-sky mb-2">
                Convite para {organization?.name}
              </h1>
              <p className="text-gray-600 mb-4">
                Você foi convidado por <strong>{invite?.inviter?.name}</strong> para participar desta organização
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Email do convite:</p>
                <p className="font-medium text-deep-sky">{invite?.email}</p>
              </div>
            </div>

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
                  Faça login para aceitar o convite
                </p>
                <Link 
                  href={`/login?redirect=/invite/${code}`}
                  className="w-full bg-gradient-to-r from-flight-blue to-feather-blue text-white py-3 px-6 rounded-xl hover:from-deep-sky hover:to-flight-blue inline-block text-center font-medium transition-all transform hover:scale-105"
                >
                  Fazer Login
                </Link>
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
