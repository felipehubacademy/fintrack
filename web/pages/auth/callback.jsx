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
        // Verificar se já está autenticado
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Já tem sessão, redirecionar direto
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, organization_id')
              .eq('email', user.email)
              .single();

            if (userData?.organization_id && userData?.id) {
              const dynamicUrl = `/org/${userData.organization_id}/user/${userData.id}/dashboard`;
              router.replace(dynamicUrl);
              return;
            }
          }
        }

        // Prefer hash tokens (magic link) if present
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (!access_token || !refresh_token) {
            throw new Error('Tokens ausentes no callback');
          }
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setErr) throw setErr;
          setStatus('success');
          
          // Buscar dados do usuário para construir URL dinâmica
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Buscar por EMAIL para pegar o ID correto da tabela users
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, organization_id')
              .eq('email', user.email)
              .single();

            if (userData?.organization_id && userData?.id) {
              const dynamicUrl = `/org/${userData.organization_id}/user/${userData.id}/dashboard`;
              router.replace(dynamicUrl);
              return;
            }
          }
          
          // Fallback
          router.replace('/login');
          return;
        }

        // Check if there's a code in query params for PKCE flow
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        
        if (code) {
          // Handle PKCE code flow (code in query string)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus('success');
          
          // Buscar dados do usuário para construir URL dinâmica
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Buscar por EMAIL para pegar o ID correto da tabela users
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, organization_id')
              .eq('email', user.email)
              .single();

            if (userData?.organization_id && userData?.id) {
              const dynamicUrl = `/org/${userData.organization_id}/user/${userData.id}/dashboard`;
              router.replace(dynamicUrl);
              return;
            }
          }
          
          router.replace('/login');
          return;
        }
        
        // Nenhum método de autenticação encontrado
        throw new Error('Nenhum token ou código de autenticação encontrado');
      } catch (err) {
        console.error('Erro no callback:', err);
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


