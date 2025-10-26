import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Mail, Loader2, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  // Preencher email se vier da query string
  useEffect(() => {
    if (router.query.email) {
      setEmail(router.query.email);
    }
  }, [router.query.email]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage('');
      setIsSuccess(false);
      
      console.log('🔐 Tentando login com:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      console.log('📊 Resposta do login:', { data, error });

      if (error) throw error;
      
      if (data?.session) {
        console.log('✅ Sessão criada, aguardando cookies...');
        // Dar tempo para os cookies serem salvos
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se há redirect na URL
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        
        console.log('🚀 Redirecionando para callback');
        window.location.href = redirect || '/auth/callback';
      } else {
        console.log('⚠️ Login sem erro mas sem sessão');
        setMessage('Login realizado mas sem sessão. Tente novamente.');
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      // Se o erro for de credenciais inválidas, oferecer opção de reset
      if (error.message?.includes('Invalid login credentials') || 
          error.message?.includes('Email not confirmed')) {
        setMessage(
          <>
            Email ou senha incorretos. Primeira vez fazendo login? {' '}
            <Link href="/reset-password" className="font-semibold text-blue-700 hover:underline">
              Crie sua senha aqui
            </Link>
          </>
        );
      } else {
        setMessage(error.message || 'Email ou senha incorretos');
      }
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Middleware já cuida do redirect, não precisa checar aqui

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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Senha
                  </label>
                  <Link href="/reset-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            {/* Error Message */}
            {message && (
              <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-800 text-center">
                  {typeof message === 'string' ? message : message}
                </p>
              </div>
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

            {/* Create Account Link */}
            <Link
              href="/account-type"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gray-50 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all font-semibold transform hover:scale-[1.02]"
            >
              Criar Nova Conta
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
