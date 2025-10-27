import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Mail, Phone, User, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function SignupInvite() {
  const router = useRouter();
  const { email, invite_code } = router.query;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [validation, setValidation] = useState({
    name: null,
    phone: null,
    password: null,
    confirmPassword: null
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invite, setInvite] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [phoneDuplicate, setPhoneDuplicate] = useState(false);

  // Verificar convite ao carregar
  useEffect(() => {
    console.log('🔍 Query params:', { email, invite_code });
    if (invite_code) {
      console.log('📥 Buscando convite:', invite_code);
      fetchInvite(invite_code);
    } else {
      console.log('❌ invite_code não encontrado na URL');
    }
  }, [invite_code, email]);

  const fetchInvite = async (inviteToken) => {
    console.log('🔍 fetchInvite chamado com token:', inviteToken);
    try {
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
      
      console.log('📊 Resultado do convite:', { inviteData, inviteError });

      if (inviteError) {
        setError('Convite inválido, expirado ou já foi usado');
      } else {
        setInvite(inviteData);
        setOrganization(inviteData.organizations);
        
        // Preencher nome e email automaticamente
        if (inviteData.name) {
          setFormData(prev => ({ ...prev, name: inviteData.name }));
          setValidation(prev => ({ ...prev, name: validateName(inviteData.name) }));
        }
        
        // Preencher email se disponível
        if (inviteData.email && !email) {
          router.replace(`/signup-invite?email=${inviteData.email}&invite_code=${inviteToken}`);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar convite:', error);
      setError('Erro ao carregar convite');
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

  // Validar senha
  const validatePassword = (password) => {
    return password.length >= 8;
  };

  // Validar confirmação de senha
  const validateConfirmPassword = (password, confirmPassword) => {
    return password === confirmPassword && password.length >= 8;
  };

  // Verificar telefone duplicado
  const checkPhoneDuplicate = async (phone) => {
    if (!phone || phone.replace(/\D/g, '').length !== 11) {
      return { exists: false };
    }
    
    try {
      const phoneNumbers = phone.replace(/\D/g, '');
      const phoneWithCountryCode = `55${phoneNumbers}`;
      
      const response = await fetch('/api/auth/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneWithCountryCode })
      });
      
      const data = await response.json();
      return data.checks?.phone || { exists: false };
    } catch (error) {
      console.error('Erro ao verificar telefone:', error);
      return { exists: false };
    }
  };

  // Handler para mudanças no formulário
  const handleChange = async (field, value) => {
    if (field === 'phone') {
      const formatted = formatPhone(value);
      setFormData(prev => ({ ...prev, phone: formatted }));
      
      const isValid = validatePhone(formatted);
      setValidation(prev => ({ ...prev, phone: isValid }));
      
      // Verificar duplicata em tempo real
      if (isValid) {
        const duplicate = await checkPhoneDuplicate(formatted);
        if (duplicate.exists) {
          setPhoneDuplicate(true);
          setValidation(prev => ({ ...prev, phone: false }));
        } else {
          setPhoneDuplicate(false);
        }
      } else {
        setPhoneDuplicate(false);
      }
    } else if (field === 'password') {
      setFormData(prev => ({ ...prev, password: value }));
      setValidation(prev => ({ 
        ...prev, 
        password: validatePassword(value),
        confirmPassword: value && formData.confirmPassword ? validateConfirmPassword(value, formData.confirmPassword) : null
      }));
    } else if (field === 'confirmPassword') {
      setFormData(prev => ({ ...prev, confirmPassword: value }));
      setValidation(prev => ({ ...prev, confirmPassword: validateConfirmPassword(formData.password, value) }));
    }
    // Nome não precisa de handler pois é readOnly
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validações finais
      if (!validation.name || !validation.phone || !validation.password || !validation.confirmPassword) {
        setError('Por favor, preencha todos os campos corretamente');
        return;
      }

      // Verificar se o email do convite confere
      if (invite && email !== invite.email) {
        setError('Este convite é para um email diferente');
        return;
      }

      // Normalizar telefone: extrair apenas números e adicionar código do Brasil (55)
      const phoneNumbers = formData.phone.replace(/\D/g, ''); // Remove tudo que não é número
      const phoneWithCountryCode = `55${phoneNumbers}`; // Adiciona 55 no início
      
      // Verificar duplicatas
      const duplicateCheck = await fetch('/api/auth/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          phone: phoneWithCountryCode 
        })
      });
      
      const duplicateData = await duplicateCheck.json();
      
      if (duplicateData.hasDuplicates) {
        if (duplicateData.checks.phone?.exists) {
          setError('Este telefone já está cadastrado. Use outro número ou faça login.');
          setLoading(false);
          return;
        }
        if (duplicateData.checks.email?.exists) {
          setError('Este email já está cadastrado. Faça login para continuar.');
          setLoading(false);
          return;
        }
      }
      
      // Criar conta do usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br'}/auth/email-confirmed`,
          data: {
            name: formData.name,
            phone: phoneWithCountryCode
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Criar registro do usuário na nossa tabela
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          name: formData.name,
          phone: phoneWithCountryCode, // Salvar como: 5511999999999 (55 + DDD + número)
          organization_id: organization.id,
          role: invite?.role || 'member',
          is_active: true
        });

      if (userError) throw userError;

      // Remover convite da tabela pending_invites
      if (invite_code) {
        const { error: inviteError } = await supabase
          .from('pending_invites')
          .delete()
          .eq('invite_code', invite_code);

        if (inviteError) throw inviteError;
      }

      // Aguardar um pouco para garantir que a sessão foi criada
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirecionar para onboarding DINÂMICO
      window.location.href = `/org/${organization.id}/user/${authData.user.id}/onboarding/1`;

    } catch (err) {
      console.error('❌ Erro no cadastro:', err);
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  if (error && !invite) {
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
              <p className="text-gray-600 mb-6">
                Você foi convidado por <strong>{invite?.inviter?.name}</strong>
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-6 text-center">
              Olá, <strong>{invite?.name?.split(' ')[0]}</strong>! Complete seus dados para entrar na organização.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    readOnly
                    value={formData.name}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 cursor-not-allowed"
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
                <p className="text-xs text-gray-500 mt-1">
                  Nome preenchido a partir do convite
                </p>
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
                {phoneDuplicate && (
                  <p className="text-xs text-red-600 mt-1">
                    Este telefone já está cadastrado. Use outro número ou faça login.
                  </p>
                )}
                {!phoneDuplicate && validation.phone === null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: DDD + 9 dígitos (ex: 11 99999-9999)
                  </p>
                )}
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-flight-blue focus:border-transparent transition-all ${
                      validation.password === false ? 'border-red-500' : 
                      validation.password === true ? 'border-green-500' : 
                      'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {validation.password !== null && (
                    <div className="absolute right-10 top-3">
                      {validation.password ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {validation.password === false && (
                  <p className="text-xs text-red-600 mt-1">
                    A senha deve ter no mínimo 8 caracteres
                  </p>
                )}
              </div>

              {/* Confirmar Senha */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-flight-blue focus:border-transparent transition-all ${
                      validation.confirmPassword === false ? 'border-red-500' : 
                      validation.confirmPassword === true ? 'border-green-500' : 
                      'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {validation.confirmPassword !== null && (
                    <div className="absolute right-10 top-3">
                      {validation.confirmPassword ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {validation.confirmPassword === false && (
                  <p className="text-xs text-red-600 mt-1">
                    {formData.password && formData.confirmPassword ? 
                      'As senhas não coincidem' : 
                      'A senha deve ter no mínimo 8 caracteres'
                    }
                  </p>
                )}
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
                disabled={loading || !validation.name || !validation.phone || phoneDuplicate || !validation.password || !validation.confirmPassword}
                className="w-full bg-gradient-to-r from-flight-blue to-feather-blue text-white font-semibold py-3 px-4 rounded-xl hover:from-deep-sky hover:to-flight-blue focus:outline-none focus:ring-2 focus:ring-flight-blue focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {loading ? 'Criando conta...' : 'Criar Conta e Entrar'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Já tem uma conta?{' '}
                <Link 
                  href={`/login?redirect=/invite/${invite_code}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Fazer login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
