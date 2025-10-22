import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Building2, User, Mail, Phone, Loader2, CheckCircle, Copy, Sparkles, Users } from 'lucide-react';

export default function CreateOrganization() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPhone: ''
  });
  const [validation, setValidation] = useState({
    email: null,
    phone: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);

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

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 13;
  };

  const handleChange = (field, value) => {
    if (field === 'adminPhone') {
      const formatted = formatPhone(value);
      setFormData(prev => ({ ...prev, adminPhone: formatted }));
      setValidation(prev => ({ ...prev, phone: validatePhone(formatted) }));
    } else if (field === 'adminEmail') {
      setFormData(prev => ({ ...prev, adminEmail: value }));
      setValidation(prev => ({ ...prev, email: validateEmail(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!validation.email || !validation.phone) {
        throw new Error('Por favor, preencha todos os campos corretamente');
      }

      // Enviar magic link
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: formData.adminEmail,
        options: {
          data: {
            name: formData.adminName,
            phone: formData.adminPhone
          }
        }
      });

      if (authError) throw authError;

      // Criar organização
      const orgId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const inviteCodeGen = generateInviteCode();

      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: orgId,
          name: formData.name,
          admin_id: userId,
          invite_code: inviteCodeGen
        });

      if (orgError) throw orgError;

      // Criar usuário
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          organization_id: orgId,
          name: formData.adminName,
          email: formData.adminEmail,
          phone: formData.adminPhone,
          role: 'admin'
        });

      if (userError) throw userError;

      // Criar centros de custo padrão
      const costCenters = [
        { name: 'Principal', type: 'individual', color: '#3B82F6' },
        { name: 'Compartilhado', type: 'shared', color: '#8B5CF6', split_percentage: 50.00 }
      ];

      for (const center of costCenters) {
        await supabase.from('cost_centers').insert({
          organization_id: orgId,
          ...center
        });
      }

      // Criar categorias padrão
      const categories = [
        'Alimentação', 'Transporte', 'Saúde', 'Lazer',
        'Contas', 'Casa', 'Educação', 'Investimentos', 'Outros'
      ];

      for (const category of categories) {
        await supabase.from('budget_categories').insert({
          organization_id: orgId,
          name: category,
          is_default: true
        });
      }

      setInviteCode(inviteCodeGen);
      setSuccess(true);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(link);
  };

  // Success State
  if (success && inviteCode) {
    return (
      <>
        <Head>
          <title>Organização Criada - MeuAzulão</title>
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
          
          <div className="relative z-10 w-full max-w-lg">
            <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
              {/* Success Icon */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <img 
                      src="/images/logo_flat.svg" 
                      alt="MeuAzulão" 
                      className="w-20 h-20"
                    />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Organização Criada!
                </h1>
                <p className="text-gray-600">
                  Link mágico enviado para <span className="font-semibold">{formData.adminEmail}</span>
                </p>
              </div>

              {/* Invite Code */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border border-blue-100">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">Código de Convite</p>
                </div>
                <div className="bg-white rounded-xl p-4 mb-3">
                  <p className="text-3xl font-mono font-bold text-center text-gray-900 tracking-wider">
                    {inviteCode}
                  </p>
                </div>
                <p className="text-xs text-center text-gray-600">
                  Compartilhe este código para convidar sua família
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={copyInviteLink}
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold transform hover:scale-[1.02]"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Copiar Link de Convite
                </button>

                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gray-50 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all font-semibold transform hover:scale-[1.02]"
                >
                  Ir para Login
                </Link>
              </div>

              {/* Warning */}
              <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      Importante
                    </p>
                    <p className="text-xs text-yellow-800">
                      Verifique seu email e clique no link mágico antes de fazer login
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Form State
  return (
    <>
      <Head>
        <title>Criar Organização - MeuAzulão</title>
        <meta name="description" content="Crie sua organização no MeuAzulão" />
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
                Criar Organização
              </h1>
              <p className="text-gray-600">
                Configure sua família ou empresa
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Organização
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    placeholder="Ex: Família Silva"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
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
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="adminPhone"
                    type="tel"
                    placeholder="+55 (11) 99999-9999"
                    required
                    value={formData.adminPhone}
                    onChange={(e) => handleChange('adminPhone', e.target.value)}
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
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas números, formataremos automaticamente
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !validation.email || !validation.phone}
                className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Criando organização...
                  </span>
                ) : (
                  'Criar Organização'
                )}
              </button>
            </form>

            {/* Footer Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Você receberá um email
                  </p>
                  <p className="text-xs text-blue-700">
                    Enviaremos um link mágico para confirmar sua conta
                  </p>
                </div>
              </div>
            </div>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
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
