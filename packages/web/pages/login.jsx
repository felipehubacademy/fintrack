import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Mail, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data?.session) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        window.location.href = redirect || '/auth/callback';
      } else {
        setMessage('Login realizado mas sem sessão. Tente novamente.');
      }
    } catch (error) {
      if (error.message?.includes('Invalid login credentials') ||
          error.message?.includes('Email not confirmed')) {
        setMessage(
          <>
            Email ou senha incorretos. Esqueceu sua senha? {' '}
            <Link href="/reset-password" className="font-semibold text-azulao-400 hover:underline">
              Redefina aqui
            </Link>
            {' '}ou{' '}
            <Link href="/account-type" className="font-semibold text-azulao-400 hover:underline">
              crie sua conta
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

  return (
    <>
      <Head>
        <title>Login - MeuAzulão</title>
        <meta name="description" content="Acesse sua conta no MeuAzulão" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col">
        {/* Hero gradient header */}
        <div className="relative bg-gradient-to-br from-azulao-500 via-azulao-600 to-azulao-700 pt-16 pb-32 px-4 text-center overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-azulao-400/30 rounded-full blur-3xl" />

          {/* Back link */}
          <Link
            href="/"
            className="absolute top-6 left-6 flex items-center space-x-2 text-white/70 hover:text-white transition-colors z-10 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">Voltar</span>
          </Link>

          <div className="relative z-10">
            <img
              src="/images/logo_flat.svg"
              alt="MeuAzulão"
              className="w-20 h-20 mx-auto mb-4 brightness-0 invert"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              MeuAzulão
            </h1>
            <p className="text-white/80 text-lg">
              Gestão Financeira Inteligente
            </p>
          </div>
        </div>

        {/* Floating form card */}
        <div className="flex-1 bg-gray-50 px-4 pb-8">
          <div className="relative z-10 w-full max-w-md mx-auto -mt-20">
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
                Entrar na conta
              </h2>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-azulao-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Senha
                    </label>
                    <Link href="/reset-password" className="text-sm text-azulao-500 hover:text-azulao-600 font-medium">
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
                      className="w-full pl-12 pr-12 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-azulao-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-azulao-500 to-azulao-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-azulao-500/30 focus:outline-none focus:ring-2 focus:ring-azulao-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
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

              {message && (
                <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800 text-center">
                    {typeof message === 'string' ? message : message}
                  </p>
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Não tem uma conta?</span>
                </div>
              </div>

              <Link
                href="/account-type"
                className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gray-50 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-accent-300 transition-all font-semibold transform hover:scale-[1.02]"
              >
                Criar Nova Conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
