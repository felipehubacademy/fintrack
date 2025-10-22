import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        // Handle magic link / OTP exchange and persist session
        const { data, error } = await supabase.auth.exchangeCodeForSession();
        if (error) throw error;
        // Successful login, redirect to dashboard
        setStatus('success');
        router.replace('/dashboard');
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Falha ao processar login');
      }
    };
    run();
  }, [router]);

  return (
    <>
      <Head>
        <title>Entrando...</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-gray-600">Processando seu login...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-red-600 text-3xl mb-2">❌</div>
              <p className="text-gray-700 mb-4">{message}</p>
              <button
                onClick={() => router.replace('/login')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                Voltar ao login
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}


