import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage('');
      
      // Verificar se email é permitido (validação no backend via RLS)
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        // Se o email não estiver na lista de permitidos, o RLS vai bloquear
        throw error;
      }
      
      setMessage('✅ Link mágico enviado! Verifique seu email.');
      setMessage('📧 Enviamos um link de acesso para seu email. Verifique sua caixa de entrada!');
    } catch (error) {
      if (error.message.includes('not authorized')) {
        setMessage('❌ Email não autorizado. Entre em contato com o administrador.');
      } else {
        setMessage(`❌ Erro: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fog-mist flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-flight-blue to-feather-blue rounded-full p-4 mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-deep-sky mb-2">MeuAzulão</h1>
          <p className="text-gray-600">Controle financeiro multi-usuário via WhatsApp</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-flight-blue to-feather-blue text-white font-semibold py-3 px-4 rounded-lg hover:from-deep-sky hover:to-flight-blue focus:outline-none focus:ring-2 focus:ring-flight-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </span>
            ) : (
              '🔐 Enviar Link Mágico'
            )}
          </button>
        </form>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <p className="text-sm text-center">{message}</p>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>

        {/* Organization Options */}
        <div className="space-y-3">
          <Link
            href="/create-organization"
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-all font-medium text-center block"
          >
            🏠 Criar Nova Organização
          </Link>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Já tem um código de convite?</p>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Código de convite"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center font-mono"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    window.location.href = `/invite/${e.target.value}`;
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const code = e.target.previousElementSibling.value;
                  if (code) {
                    window.location.href = `/invite/${code}`;
                  }
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            🔒 Login sem senha via email
          </p>
        </div>
      </div>
    </div>
  );
}
