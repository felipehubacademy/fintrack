import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function InvitePage() {
  const router = useRouter();
  const { code } = router.query;
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (code) {
      fetchOrganization(code);
      checkUser();
    }
  }, [code]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchOrganization = async (inviteCode) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          users!inner(id, name, email, role)
        `)
        .eq('invite_code', inviteCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Código de convite inválido ou expirado');
        } else {
          throw error;
        }
      } else {
        setOrganization(data);
      }

    } catch (error) {
      console.error('❌ Erro ao buscar organização:', error);
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async () => {
    if (!user) {
      // Redirecionar para login
      router.push(`/?redirect=/invite/${code}`);
      return;
    }

    try {
      setJoining(true);

      // Verificar se usuário já está na organização
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (existingUser) {
        setError('Você já é membro desta organização');
        return;
      }

      // Adicionar usuário à organização
      const { error } = await supabase
        .from('users')
        .update({
          organization_id: organization.id,
          role: 'member',
          is_active: true
        })
        .eq('id', user.id);

      if (error) throw error;

      // Redirecionar para dashboard
      router.push('/dashboard/v2');

    } catch (error) {
      console.error('❌ Erro ao entrar na organização:', error);
      setError('Erro ao entrar na organização');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Convite Inválido</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link 
              href="/" 
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 inline-block"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Convite para {organization.name}
            </h1>
            <p className="text-gray-600 mb-6">
              Você foi convidado para participar desta organização no FinTrack
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Código de convite:</p>
              <p className="font-mono text-lg font-bold text-purple-600">
                {organization.invite_code}
              </p>
            </div>

            {user ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Olá, <strong>{user.email}</strong>! Clique abaixo para entrar na organização.
                </p>
                <button
                  onClick={handleJoinOrganization}
                  disabled={joining}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? 'Entrando...' : 'Entrar na Organização'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Faça login para aceitar o convite
                </p>
                <Link 
                  href={`/?redirect=/invite/${code}`}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 inline-block text-center"
                >
                  Fazer Login
                </Link>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Ao aceitar este convite, você terá acesso aos dados financeiros 
                compartilhados desta organização.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
