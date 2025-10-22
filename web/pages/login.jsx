import { useState } from 'react';
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Mail, Loader2, CheckCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage('');
      setIsSuccess(false);
      
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br'}/auth/callback`;
      console.log('🔍 Login - Redirect URL:', redirectUrl);
      console.log('🔍 Login - NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      
      setMessage('Link mágico enviado! Verifique seu email.');
      setIsSuccess(true);
    } catch (error) {
      setMessage(error.message || 'Erro ao enviar link de acesso');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle magic link landing like /login#access_token=... or code exchange
  useEffect(() => {
    const finalizeAuth = async () => {
      try {
        const hasHash = typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token');
        const hasCode = typeof window !== 'undefined' && (new URL(window.location.href)).searchParams.get('code');
        if (hasHash || hasCode) {
          if (hasHash) {
            const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
              if (setErr) throw setErr;
            }
          } else {
            const { error } = await supabase.auth.exchangeCodeForSession();
            if (error) throw error;
          }
          router.replace('/dashboard');
        }
      } catch (err) {
        // Silent; user can request link again
        console.error('Auth finalize error:', err?.message || err);
      }
    };
    finalizeAuth();
    // Also auto-redirect if already signed in
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace('/dashboard');
      }
    })();
  }, [router]);

  return (
    <>
      <Head>
        <title>Login - MeuAzulão</title>
        <meta name="description" content="Acesse sua conta no MeuAzulão" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-6">
                <img 
                  src="/images/logo_flat.svg" 
                  alt="MeuAzulão" 
                  className="w-20 h-20"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-600">
                Entre com seu email para acessar sua conta
              </p>
            </div>

            {/* Success State */}
            {isSuccess ? (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Link Enviado!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Verifique sua caixa de entrada em <span className="font-semibold">{email}</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setMessage('');
                      setEmail('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Enviar para outro email
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Enviando link...
                      </span>
                    ) : (
                      'Enviar Link de Acesso'
                    )}
                  </button>
                </form>

                {/* Error Message */}
                {message && !isSuccess && (
                  <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-800 text-center">{message}</p>
                  </div>
                )}

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium mb-1">
                        Login sem senha
                      </p>
                      <p className="text-xs text-blue-700">
                        Você receberá um link mágico no seu email para acessar sua conta de forma segura
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Não tem uma conta?</span>
              </div>
            </div>

            {/* Create Organization Link */}
            <Link
              href="/create-organization"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gray-50 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all font-semibold transform hover:scale-[1.02]"
            >
              Criar Nova Organização
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
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
    </>
  );
}
