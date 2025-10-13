import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

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
  const [inviteCode, setInviteCode] = useState(null);

  // Formatar telefone automaticamente
  const formatPhone = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 13 dígitos (55 + 11 dígitos)
    const limited = numbers.slice(0, 13);
    
    // Formata: +55 (11) 99999-9999
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

  // Validar email em tempo real
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Validar telefone em tempo real
  const validatePhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 13; // +55 (11) 99999-9999
  };

  // Handler para mudanças no formulário
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validações finais
      if (!validation.email) {
        throw new Error('Email inválido');
      }
      if (!validation.phone) {
        throw new Error('Telefone inválido. Use formato: +55 (11) 99999-9999');
      }

      console.log('🔄 Criando organização...');

      // 1. Criar usuário no Supabase Auth via Magic Link
      const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
        email: formData.adminEmail,
        options: {
          data: {
            name: formData.adminName,
            phone: formData.adminPhone
          }
        }
      });

      if (authError) {
        console.error('❌ Erro no auth:', authError);
        throw new Error('Erro ao enviar magic link: ' + authError.message);
      }

      console.log('✅ Magic link enviado para:', formData.adminEmail);

      // 2. Criar organização diretamente no Supabase
      const orgId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const inviteCodeGen = generateInviteCode();

      // Criar organização
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: orgId,
          name: formData.name,
          admin_id: userId,
          invite_code: inviteCodeGen
        });

      if (orgError) {
        console.error('❌ Erro ao criar organização:', orgError);
        throw new Error('Erro ao criar organização: ' + orgError.message);
      }

      console.log('✅ Organização criada:', orgId);

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

      if (userError) {
        console.error('❌ Erro ao criar usuário:', userError);
        throw new Error('Erro ao criar usuário: ' + userError.message);
      }

      console.log('✅ Usuário criado:', userId);

      // Criar centros de custo padrão
      const costCenters = [
        { name: 'Felipe', type: 'individual', color: '#3B82F6' },
        { name: 'Letícia', type: 'individual', color: '#EC4899' },
        { name: 'Compartilhado', type: 'shared', color: '#8B5CF6', split_percentage: 50.00 }
      ];

      for (const center of costCenters) {
        const { error: ccError } = await supabase
          .from('cost_centers')
          .insert({
            organization_id: orgId,
            ...center
          });

        if (ccError) {
          console.error('❌ Erro ao criar centro de custo:', ccError);
        }
      }

      console.log('✅ Centros de custo criados');

      // Criar categorias de orçamento padrão
      const categories = [
        'Alimentação', 'Transporte', 'Saúde', 'Lazer',
        'Contas', 'Casa', 'Educação', 'Investimentos', 'Outros'
      ];

      for (const category of categories) {
        const { error: catError } = await supabase
          .from('budget_categories')
          .insert({
            organization_id: orgId,
            name: category,
            is_default: true
          });

        if (catError) {
          console.error('❌ Erro ao criar categoria:', catError);
        }
      }

      console.log('✅ Categorias criadas');

      // Mostrar código de convite
      setInviteCode(inviteCodeGen);

    } catch (err) {
      console.error('❌ Erro geral:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gerar código de convite
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  if (inviteCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-green-600 to-blue-600 rounded-full p-4 mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Organização Criada!</h1>
            <p className="text-gray-600 mb-6">
              Enviamos um link de confirmação para <strong>{formData.adminEmail}</strong>
            </p>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Seu código de convite:</p>
              <div className="font-mono text-3xl font-bold text-purple-600 tracking-wider">
                {inviteCode}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Compartilhe este código com sua família
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`http://localhost:3000/invite/${inviteCode}`);
                  alert('Link copiado!');
                }}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-all font-medium"
              >
                📋 Copiar Link de Convite
              </button>

              <Link
                href="/"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-all font-medium text-center"
              >
                ✉️ Ir para Login
              </Link>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Importante:</strong> Verifique seu email e clique no link de confirmação antes de fazer login.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <svg className="w-8 h-8 text-gray-600 hover:text-gray-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-4 mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar Organização</h1>
          <p className="text-gray-600">Configure sua família ou empresa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome da Organização */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Organização
            </label>
            <input
              id="name"
              type="text"
              placeholder="Ex: Família Silva"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>

          {/* Nome do Admin */}
          <div>
            <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-2">
              Seu Nome
            </label>
            <input
              id="adminName"
              type="text"
              placeholder="Ex: João Silva"
              required
              value={formData.adminName}
              onChange={(e) => handleChange('adminName', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>

          {/* Email com validação */}
          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Seu Email
            </label>
            <div className="relative">
              <input
                id="adminEmail"
                type="email"
                placeholder="seu@email.com"
                required
                value={formData.adminEmail}
                onChange={(e) => handleChange('adminEmail', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                  validation.email === false ? 'border-red-500' : 
                  validation.email === true ? 'border-green-500' : 
                  'border-gray-300'
                }`}
              />
              {validation.email !== null && (
                <div className="absolute right-3 top-3">
                  {validation.email ? (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp com formatação automática */}
          <div>
            <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Seu WhatsApp
            </label>
            <div className="relative">
              <input
                id="adminPhone"
                type="tel"
                placeholder="+55 (11) 99999-9999"
                required
                value={formData.adminPhone}
                onChange={(e) => handleChange('adminPhone', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                  validation.phone === false ? 'border-red-500' : 
                  validation.phone === true ? 'border-green-500' : 
                  'border-gray-300'
                }`}
              />
              {validation.phone !== null && (
                <div className="absolute right-3 top-3">
                  {validation.phone ? (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
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
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading || !validation.email || !validation.phone}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Criando...' : '🚀 Criar Organização'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Ao criar, você receberá um email de confirmação
          </p>
        </div>
      </div>
    </div>
  );
}