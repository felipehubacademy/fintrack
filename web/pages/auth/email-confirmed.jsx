import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function EmailConfirmed() {
  const router = useRouter();

  useEffect(() => {
    // Aguardar 3 segundos e redirecionar para login
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Head>
        <title>Email Confirmado - MeuAzulão</title>
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full mx-4 text-center">
          <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-6 animate-scale-in" />
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Email Confirmado! ✅
          </h1>
          
          <p className="text-gray-600 mb-8">
            Sua conta foi ativada com sucesso. Você será redirecionado para o login em instantes.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Redirecionando...</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
}


