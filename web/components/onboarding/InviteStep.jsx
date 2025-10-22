import { useState } from 'react';
import { Mail, Send, CheckCircle, Users, X, UserPlus, AlertCircle } from 'lucide-react';

export default function InviteStep({ organization, user, onComplete, onDataChange }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return phone;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const sendInvite = async () => {
    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Por favor, insira um email válido' });
      return;
    }

    if (phone && phone.replace(/\D/g, '').length < 11) {
      setMessage({ type: 'error', text: 'Telefone inválido' });
      return;
    }

    if (invites.some(invite => invite.email === email)) {
      setMessage({ type: 'error', text: 'Este email já foi convidado' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          phone: phone.replace(/\D/g, ''),
          organizationId: organization.id,
          invitedBy: user?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newInvite = {
          id: Date.now(),
          email: email,
          phone: phone,
          status: 'sent',
          sentAt: new Date().toISOString()
        };
        setInvites([...invites, newInvite]);
        setEmail('');
        setPhone('');
        setMessage({ type: 'success', text: '✓ Convite enviado com sucesso!' });
        
        if (onDataChange) {
          onDataChange({ invites_sent: invites.length + 1 });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao enviar convite' });
      }
    } catch (error) {
      console.error('❌ Erro ao enviar convite:', error);
      setMessage({ type: 'error', text: 'Erro ao enviar convite. Tente novamente.' });
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
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
          <Users className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Convide sua Família
        </h2>
        <p className="text-white/80 text-lg">
          Quanto mais pessoas, melhor o controle financeiro!
        </p>
      </div>

      {/* Invite Form */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8">
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Email do Familiar
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendInvite()}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              WhatsApp (Opcional)
            </label>
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={handlePhoneChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={sendInvite}
            disabled={loading || !email}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Enviar Convite</span>
              </>
            )}
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mt-4 p-4 rounded-xl flex items-center space-x-3 ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-400/30' 
              : 'bg-red-500/20 border border-red-400/30'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
            )}
            <p className={message.type === 'success' ? 'text-green-200' : 'text-red-200'}>
              {message.text}
            </p>
          </div>
        )}
      </div>

      {/* Invites List */}
      {invites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span>Convites Enviados ({invites.length})</span>
          </h3>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-green-300" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{invite.email}</p>
                    {invite.phone && (
                      <p className="text-white/60 text-sm">{invite.phone}</p>
                    )}
                    <p className="text-white/40 text-xs mt-1">
                      Enviado em {new Date(invite.sentAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeInvite(invite.id)}
                  className="p-2 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-500/20 to-green-500/20 backdrop-blur-xl border border-blue-400/30 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <UserPlus className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
          <div className="text-left">
            <h4 className="font-semibold text-white mb-2">
              Como funciona?
            </h4>
            <p className="text-white/80 text-sm mb-3">
              Seus familiares receberão um email com um link para se cadastrar. 
              Eles terão acesso ao mesmo dashboard e poderão registrar despesas via WhatsApp com o Zul!
            </p>
            <p className="text-white/60 text-xs">
              💡 Você pode convidar mais pessoas depois nas configurações
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={handleComplete}
          className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105"
        >
          {invites.length > 0 ? 'Continuar' : 'Pular por Agora'}
        </button>
      </div>
    </div>
  );
}
