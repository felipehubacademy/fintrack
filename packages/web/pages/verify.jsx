import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar token');
      }

      setStatus('success');
      setMessage('WhatsApp verificado com sucesso!');

      // Redirecionar para o dashboard após 3 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Erro ao verificar token:', error);
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <>
      <Head>
        <title>Verificar WhatsApp - MeuAzulão</title>
        <meta name="description" content="Verificação de WhatsApp" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
            {/* Logo */}
            <div className="text-center mb-8">
              <img 
                src="/images/logo_flat.svg" 
                alt="MeuAzulão" 
                className="w-16 h-16 mx-auto mb-6"
              />
            </div>

            {/* Status */}
            <div className="text-center">
              {status === 'verifying' && (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Verificando...
                  </h1>
                  <p className="text-gray-600">
                    Aguarde enquanto validamos seu WhatsApp
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    WhatsApp Verificado!
                  </h1>
                  <p className="text-gray-600 mb-6">
                    {message}
                  </p>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-800">
                      Redirecionando para o dashboard...
                    </p>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Erro na Verificação
                  </h1>
                  <p className="text-gray-600 mb-6">
                    {message}
                  </p>
                  <div className="space-y-3">
                    <Link
                      href="/dashboard"
                      className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold transform hover:scale-[1.02]"
                    >
                      Ir para o Dashboard
                    </Link>
                    <Link
                      href="/"
                      className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gray-50 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all font-medium"
                    >
                      Voltar ao Início
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

