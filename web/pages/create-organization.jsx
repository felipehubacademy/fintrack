import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Criar usuário no Supabase Auth (se não existir)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: 'temp_password_123', // Senha temporária
        options: {
          data: {
            name: formData.adminName,
            phone: formData.adminPhone
          }
        }
      });

      if (authError && authError.message !== 'User already registered') {
        throw authError;
      }

      const userId = authData?.user?.id;

      // 2. Criar organização
      const response = await fetch('https://fintrack-backend-theta.vercel.app/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          admin_id: userId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar organização');
      }

      setSuccess({
        organization: result.organization,
        inviteCode: result.organization.invite_code
      });

    } catch (error) {
      console.error('❌ Erro ao criar organização:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Organização Criada!
              </h1>
              <p className="text-gray-600 mb-6">
                Sua organização <strong>{success.organization.name}</strong> foi criada com sucesso.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Código de convite:</p>
                <p className="font-mono text-2xl font-bold text-purple-600">
                  {success.inviteCode}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Compartilhe este código para convidar outros membros
                </p>
              </div>

              <div className="space-y-3">
                <Link 
                  href="/dashboard/v2"
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 inline-block text-center"
                >
                  Ir para Dashboard
                </Link>
                <button
                  onClick={() => navigator.clipboard.writeText(success.inviteCode)}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200"
                >
                  Copiar Código
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Criar Organização
            </h1>
            <p className="text-gray-600">
              Crie uma nova organização para gerenciar despesas compartilhadas
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Organização
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Família Xavier"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu Nome
              </label>
              <input
                type="text"
                name="adminName"
                value={formData.adminName}
                onChange={handleInputChange}
                placeholder="Ex: Felipe Xavier"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu Email
              </label>
              <input
                type="email"
                name="adminEmail"
                value={formData.adminEmail}
                onChange={handleInputChange}
                placeholder="felipe@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu WhatsApp
              </label>
              <input
                type="tel"
                name="adminPhone"
                value={formData.adminPhone}
                onChange={handleInputChange}
                placeholder="+5511999999999"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: +5511999999999 (com código do país)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Criar Organização'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="text-purple-600 hover:text-purple-700 text-sm"
            >
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
