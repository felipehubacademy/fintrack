import { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, Users, X, UserPlus, AlertCircle, Lightbulb } from 'lucide-react';
import { useNotificationContext } from '../../contexts/NotificationContext';
import ZulFloatingButton from '../ZulFloatingButton';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { useI18n } from '../../contexts/I18nContext';

export default function InviteStep({ organization, user, onComplete, onDataChange }) {
  const { t } = useI18n();
  const { success, showError } = useNotificationContext();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member'); // Padrão: member (pode criar despesas)
  const [color, setColor] = useState('#3B82F6'); // Azul primário como padrão
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showZulCard, setShowZulCard] = useState(false);
  
  // Paleta de cores disponíveis
  const colors = [
    '#3B82F6', // Azul primário (padrão)
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
    '#10B981', '#06B6D4', '#8B5A2B', '#6B7280', '#F97316',
    '#14B8A6', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E'
  ];

  // Mostrar card do Zul após 1.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowZulCard(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const sendInvite = async () => {
    if (!validateEmail(email)) {
      showError(t('web.inviteStep.pleaseEnterAValidEmail'));
      return;
    }

    if (!name.trim()) {
      showError(t('web.inviteStep.pleaseEnterTheirName'));
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
          color: color, // Enviar cor selecionada
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
        success(t('web.inviteStep.inviteSent'));
        
        // Avançar automaticamente após enviar
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 800); // Pequeno delay para feedback visual
      } else {
        showError(data.error || t('web.shared.couldnTSendTheInvite'));
      }
    } catch (error) {
      console.error('❌ Erro ao enviar convite:', error);
      showError(t('web.inviteStep.couldnTSendTheInvite'));
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
    <>
      {/* Floating Zul Button */}
      <ZulFloatingButton />
      
      {/* Zul Info Card */}
      {showZulCard && (
        <div className="fixed bottom-28 right-28 w-96 z-50 pointer-events-auto animate-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-lg border border-gray-200 bg-white relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowZulCard(false)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-100 hover:bg-gray-200 z-10"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-12 h-12 bg-[#207DFF] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{t('web.inviteStep.tip')}</h4>
                  <p className="text-xs text-gray-600">{t('web.inviteStep.accessLevels')}</p>
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-semibold text-blue-900 text-sm mb-1">{t('web.inviteStep.viewer')}</div>
                  <p className="text-xs text-blue-700">{t('web.inviteStep.seesExpensesAndReportsCan')}</p>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
                  <div className="font-semibold text-blue-900 text-sm mb-1">{t('web.inviteStep.member')}</div>
                  <p className="text-xs text-blue-700">{t('web.inviteStep.canAddExpensesAndManage')}</p>
                </div>
                
                <div className="p-3 bg-blue-100 border border-blue-400 rounded-lg">
                  <div className="font-semibold text-blue-950 text-sm mb-1">{t('web.inviteStep.admin')}</div>
                  <p className="text-xs text-blue-800">{t('web.inviteStep.fullAccessMembersSettingsAnd')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
            {t('web.inviteStep.inviteYourPartnerOrFamily')}
          </h2>
          <p className="text-gray-600 text-lg xl:text-xl">
            {t('web.inviteStep.addSomeoneToShareYour')}
          </p>
        </div>

      {/* Invite Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 xl:p-10 shadow-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm xl:text-base font-medium mb-2">
              {t('web.inviteStep.theirEmail')}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 xl:w-6 xl:h-6 text-gray-400" />
              <input
                type="email"
                placeholder={t('web.inviteStep.nameExampleCom')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendInvite()}
                className="w-full pl-12 xl:pl-14 pr-4 py-3 xl:py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-base xl:text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm xl:text-base font-medium mb-2">
              {t('web.inviteStep.fullName')}
            </label>
            <input
              type="text"
              placeholder={t('web.inviteStep.eGSamLee')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendInvite()}
              className="w-full px-4 py-3 xl:py-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-base xl:text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm xl:text-base font-medium mb-2">
              {t('web.inviteStep.accessLevel')}
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
                {t('web.inviteStep.viewer')}
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
                {t('web.inviteStep.member')}
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
                {t('web.inviteStep.admin')}
              </button>
            </div>
            <p className="text-gray-500 text-xs xl:text-sm mt-2">
              {role === 'viewer' && t('web.inviteStep.seesExpensesAndReports')}
              {role === 'member' && t('web.inviteStep.canAddExpensesAndManage2')}
              {role === 'admin' && t('web.inviteStep.fullAccessMembersSettingsAnd2')}
            </p>
          </div>

          <div>
            <label className="block text-gray-700 text-sm xl:text-base font-medium mb-2">
              {t('web.shared.profileColor')}
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 xl:w-12 xl:h-12 rounded-full transition-all ${
                    color === c 
                      ? 'ring-2 ring-gray-800 ring-offset-2 scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={t('web.inviteStep.color', { c })}
                />
              ))}
            </div>
            <p className="text-gray-500 text-xs xl:text-sm mt-2">
              {t('web.inviteStep.thisColorMarksThemIn')}
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
              <span>{t('web.shared.sending')}</span>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 xl:w-6 xl:h-6" />
              <span>{t('web.shared.sendInvite')}</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleComplete}
          className="px-8 py-4 xl:px-10 xl:py-5 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 rounded-full font-bold text-lg xl:text-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          {t('web.inviteStep.skipThisStep')}
        </button>
      </div>
      
      <p className="text-center text-gray-500 text-sm xl:text-base">
        {t('web.inviteStep.youCanInviteMorePeople')} <span className="font-medium">{t('web.inviteStep.settingsMembers')}</span>
      </p>
      </div>
    </>
  );
}
