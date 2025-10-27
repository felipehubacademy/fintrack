import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, User, Mail, Phone, Loader2, CheckCircle, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { useRealtimeDuplicateCheck } from '../hooks/useRealtimeDuplicateCheck';
import DuplicateUserModal from '../components/DuplicateUserModal';
import HelpTooltip from '../components/ui/HelpTooltip';

export default function CreateAccount() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    dashboardName: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validation, setValidation] = useState({
    email: null,
    phone: null,
    password: null,
    confirmPassword: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  
  const { checkDuplicates, loading: duplicateLoading } = useDuplicateCheck();
  
  // Verificação em tempo real de duplicatas
  const { 
    emailStatus, 
    phoneStatus, 
    hasEmailDuplicate, 
    hasPhoneDuplicate 
  } = useRealtimeDuplicateCheck(formData.adminEmail, formData.adminPhone);
  
  // Helper para criar URL dinâmica
  const getDynamicUrl = (path, orgId, userId) => {
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    return `/org/${orgId}/user/${userId}/${path}`;
  };

  // Formatar telefone automaticamente (DDD + número, sem +)
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11); // DDD (2) + número (9)
    
    if (limited.length <= 2) {
      return `(${limited}`;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    // DDD (2) + número (9) = 11 dígitos
    return numbers.length === 11;
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    return password === confirmPassword && password.length >= 8;
  };

  const handleChange = (field, value) => {
    if (field === 'adminPhone') {
      const formatted = formatPhone(value);
      setFormData(prev => ({ ...prev, adminPhone: formatted }));
      setValidation(prev => ({ ...prev, phone: validatePhone(formatted) }));
    } else if (field === 'adminEmail') {
      setFormData(prev => ({ ...prev, adminEmail: value }));
      setValidation(prev => ({ ...prev, email: validateEmail(value) }));
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
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!validation.email || !validation.phone || !validation.password || !validation.confirmPassword || !formData.dashboardName) {
        throw new Error('Por favor, preencha todos os campos corretamente');
      }

      // Verificar duplicatas
      const duplicateCheck = await checkDuplicates(formData.adminEmail, formData.adminPhone);
      
      if (duplicateCheck.hasDuplicates) {
        setDuplicateData(duplicateCheck);
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      // Normalizar telefone: adicionar código do Brasil (55) e remover formatação
      const normalizedPhone = '55' + formData.adminPhone.replace(/\D/g, '');
      
      // Criar conta do usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.password,
        options: {
          data: {
            name: formData.adminName,
            phone: normalizedPhone
          }
        }
      });

      if (authError) throw authError;

      // Usar o ID do usuário autenticado do Supabase
      const authUserId = authData.user.id;
      const orgId = crypto.randomUUID();
      
      // Gerar código de convite aleatório (6 caracteres)
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      const inviteCode = generateInviteCode();

      // Criar organização (individual) - usar authUserId como admin_id
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: orgId,
          name: formData.dashboardName, // Nome do dashboard escolhido
          email: formData.adminEmail,
          admin_id: authUserId, // ID do usuário do Supabase Auth
          invite_code: inviteCode,
          type: 'solo'
        });

      if (orgError) throw orgError;

      // Criar usuário na tabela users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authUserId, // Mesmo ID do Supabase Auth
          organization_id: orgId,
          name: formData.adminName,
          email: formData.adminEmail,
          phone: normalizedPhone,
          role: 'admin'
        });

      if (userError) throw userError;

      // Cost center será criado automaticamente pelo trigger do banco
      // O trigger cria com default_split_percentage = 100% para contas solo
      
      // Categorias globais já estão no banco (criadas no FRESH_DATABASE_SETUP.sql)
      // Não precisamos criar categorias por organização

      // Redirecionar para o dashboard com URL dinâmica
      const dynamicUrl = getDynamicUrl('dashboard', orgId, authUserId);
      router.push(dynamicUrl);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginExisting = (user) => {
    setShowDuplicateModal(false);
    router.push(`/login?email=${encodeURIComponent(user.email)}`);
  };

  const handleCreateNew = () => {
    setShowDuplicateModal(false);
    handleSubmit(new Event('submit'));
  };

  return (
    <>
      <Head>
        <title>Criar Conta - MeuAzulão</title>
        <meta name="description" content="Crie sua conta no MeuAzulão" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
        
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

        <Link 
          href="/account-type"
          className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors z-10 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Voltar</span>
        </Link>

        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-6">
                <img 
                  src="/images/logo_flat.svg" 
                  alt="MeuAzulão" 
                  className="w-20 h-20"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Criar Conta Individual
              </h1>
              <p className="text-gray-600">
                Configure seu controle financeiro pessoal
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dashboard Name */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label htmlFor="dashboardName" className="block text-sm font-medium text-gray-700">
                    Nome do Dashboard
                  </label>
                  <HelpTooltip 
                    content="Este será o nome da sua área de controle financeiro"
                    autoOpen={true}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="dashboardName"
                    type="text"
                    placeholder="Ex: Vida no Azul, Meu Controle, Minhas Finanças"
                    required
                    value={formData.dashboardName}
                    onChange={(e) => handleChange('dashboardName', e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Admin Name */}
              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Nome
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="adminName"
                    type="text"
                    placeholder="Ex: João Silva"
                    required
                    value={formData.adminName}
                    onChange={(e) => handleChange('adminName', e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="adminEmail"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={formData.adminEmail}
                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                    className={`w-full pl-12 pr-12 py-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      validation.email === false ? 'border-red-500' : 
                      validation.email === true ? 'border-green-500' : 
                      'border-gray-300'
                    }`}
                  />
                  {validation.email !== null && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      {validation.email ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-red-500" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Email Duplicate Message */}
                {hasEmailDuplicate && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Email já está em uso</span>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-700">
                    Seu WhatsApp
                  </label>
                  <HelpTooltip 
                    content="Este será o número permitido a usar com o Zul no WhatsApp. Seu assistente de IA para controle financeiro."
                    autoOpen={true}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="adminPhone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    required
                    value={formData.adminPhone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      handleChange('adminPhone', formatted);
                    }}
                    className={`w-full pl-12 pr-12 py-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      validation.phone === false ? 'border-red-500' : 
                      validation.phone === true ? 'border-green-500' : 
                      'border-gray-300'
                    }`}
                  />
                  {validation.phone !== null && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      {validation.phone ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-red-500" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Phone Duplicate Message */}
                {hasPhoneDuplicate && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Telefone já está em uso</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`w-full pl-12 pr-12 py-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      validation.password === false ? 'border-red-500' : 
                      validation.password === true ? 'border-green-500' : 
                      'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a senha novamente"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={`w-full pl-12 pr-12 py-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      validation.confirmPassword === false ? 'border-red-500' : 
                      validation.confirmPassword === true ? 'border-green-500' : 
                      'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Security Notice */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start space-x-3">
                  <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      Acesso seguro
                    </p>
                    <p className="text-xs text-blue-700">
                      Sua senha será criptografada e protegida
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !validation.email || !validation.phone || !validation.password || !validation.confirmPassword || hasEmailDuplicate || hasPhoneDuplicate}
                className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Criando conta...
                  </span>
                ) : (
                  'Criar Conta'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Fazer login
                </Link>
              </p>
            </div>

            {/* Terms and Privacy */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Ao continuar, você concorda com nossos{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Termos de Serviço
                </a>
                {' '}e{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Política de Privacidade
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <DuplicateUserModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        duplicateData={duplicateData}
        onLoginExisting={handleLoginExisting}
        onCreateNew={handleCreateNew}
      />
    </>
  );
}

