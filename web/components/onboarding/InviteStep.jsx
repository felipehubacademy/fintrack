import { useState } from 'react';
import { Mail, Send, CheckCircle, Users, X, UserPlus, AlertCircle } from 'lucide-react';
import { useNotificationContext } from '../../contexts/NotificationContext';

export default function InviteStep({ organization, user, onComplete, onDataChange }) {
  const { success, showError } = useNotificationContext();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member'); // Padrão: member (pode criar despesas)
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const sendInvite = async () => {
    if (!validateEmail(email)) {
      showError('Por favor, insira um email válido');
      return;
    }

    if (!name.trim()) {
      showError('Por favor, insira o nome da pessoa');
      return;
    }

    setLoading(true);

    try {
      console.log('📤 Enviando convite:', {
        email,
        name,
        role,
        organizationId: organization.id,
        invitedBy: user?.id
      });

      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          name: name.trim(),
          role: role, // Enviar role selecionado
          organizationId: organization.id,
          invitedBy: user?.id
        }),
      });

      const data = await response.json();
      console.log('📥 Resposta do servidor:', data);

      if (data.success) {
        if (onDataChange) {
          onDataChange({ invites_sent: 1 });
        }
        
        // Mostrar mensagem de sucesso
        success('Convite enviado com sucesso!');
        
        // Avançar automaticamente após enviar
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 800); // Pequeno delay para feedback visual
      } else {
        showError(data.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar convite:', error);
      showError('Erro ao enviar convite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const removeInvite = (id) => {
    setInvites(invites.filter(invite => invite.id !== id));
  };

  const handleComplete = () => {
    if (onDataChange) {
      onDataChange({ invites_sent: invites.length });
    }
    onComplete();
  };

  return (
    <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
          Convide um Familiar
        </h2>
        <p className="text-gray-600 text-lg xl:text-xl">
          Adicione alguém para compartilhar o controle financeiro
        </p>
      </div>

      {/* Invite Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 xl:p-10 shadow-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm xl:text-base font-medium mb-2">
              Email do Familiar
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 xl:w-6 xl:h-6 text-gray-400" />
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendInvite()}
                className="w-full pl-12 xl:pl-14 pr-4 py-3 xl:py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-base xl:text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm xl:text-base font-medium mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              placeholder="Ex: Maria Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendInvite()}
              className="w-full px-4 py-3 xl:py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-base xl:text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm xl:text-base font-medium mb-2">
              Nível de Acesso
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('viewer')}
                className={`px-3 py-2.5 xl:py-3 rounded-lg border-2 transition-all text-sm xl:text-base font-medium ${
                  role === 'viewer'
                    ? 'border-[#207DFF] bg-[#207DFF]/5 text-[#207DFF]'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Visualizador
              </button>
              <button
                type="button"
                onClick={() => setRole('member')}
                className={`px-3 py-2.5 xl:py-3 rounded-lg border-2 transition-all text-sm xl:text-base font-medium ${
                  role === 'member'
                    ? 'border-[#207DFF] bg-[#207DFF]/5 text-[#207DFF]'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Membro
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`px-3 py-2.5 xl:py-3 rounded-lg border-2 transition-all text-sm xl:text-base font-medium ${
                  role === 'admin'
                    ? 'border-[#207DFF] bg-[#207DFF]/5 text-[#207DFF]'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Admin
              </button>
            </div>
            <p className="text-gray-500 text-xs xl:text-sm mt-2">
              {role === 'viewer' && 'Apenas visualiza despesas e relatórios'}
              {role === 'member' && 'Pode criar despesas e gerenciar seu centro de custo'}
              {role === 'admin' && 'Acesso total: gerenciar usuários, configurações e despesas'}
            </p>
          </div>

        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <button
          onClick={sendInvite}
          disabled={loading || !email}
          className="px-8 py-4 xl:px-10 xl:py-5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-full font-bold text-lg xl:text-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 xl:w-6 xl:h-6" />
              <span>Enviar Convite</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleComplete}
          className="px-8 py-4 xl:px-10 xl:py-5 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 rounded-full font-bold text-lg xl:text-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          Pular esta Etapa
        </button>
      </div>
      
      <p className="text-center text-gray-500 text-sm xl:text-base">
        Você poderá convidar mais pessoas depois em <span className="font-medium">Configurações → Membros</span>
      </p>
    </div>
  );
}
