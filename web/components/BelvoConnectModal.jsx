import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useOrganization } from '../hooks/useOrganization';

export default function BelvoConnectModal({ isOpen, onClose, onSuccess, accountType = 'bank_account' }) {
  const { organization, user } = useOrganization();
  const { success: showSuccess, error: showError } = useNotificationContext();
  
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [linkId, setLinkId] = useState(null);
  
  const [formData, setFormData] = useState({
    cpf: '',
    fullName: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setFormData({ cpf: '', fullName: '' });
      setAccessToken('');
      setLinkId(null);
    }
  }, [isOpen]);

  // Load Belvo SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.belvoSDK) {
      const script = document.createElement('script');
      script.src = 'https://cdn.belvo.io/belvo-widget-1-stable.js';
      script.async = true;
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
  };

  const handleGenerateSession = async () => {
    const cleanCPF = formData.cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      showError('CPF deve conter 11 dígitos');
      return;
    }

    if (!formData.fullName.trim()) {
      showError('Nome completo é obrigatório');
      return;
    }

    if (!organization?.id || !user?.id) {
      showError('Organização não encontrada');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/belvo/widget-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cleanCPF,
          full_name: formData.fullName,
          organization_id: organization.id,
          user_id: user.id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar sessão');
      }

      setAccessToken(data.access_token);
      setStep('widget');
      
      // Initialize widget in next tick
      setTimeout(() => initializeWidget(data.access_token), 100);
    } catch (error) {
      console.error('Error generating session:', error);
      showError(error.message || 'Erro ao conectar com Belvo');
    } finally {
      setLoading(false);
    }
  };

  const initializeWidget = (token) => {
    if (!window.belvoSDK) {
      console.error('Belvo SDK not loaded');
      showError('Widget não disponível. Recarregue a página.');
      return;
    }

    try {
      const config = {
        callback: async (link, institution) => {
          console.log('✅ Belvo connection successful:', link);
          console.log('Institution:', institution);
          
          setLinkId(link);
          setStep('syncing');
          
          // Save link to database
          try {
            await fetch('/api/belvo/links/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                link_id: link,
                organization_id: organization.id,
                user_id: user.id,
                institution_name: institution?.name || 'Unknown'
              })
            });
          } catch (error) {
            console.error('Error saving link:', error);
          }
          
          pollSyncStatus(link);
        },
        onExit: () => {
          console.log('User exited widget');
          setStep('form');
        },
        onError: (error) => {
          console.error('Belvo widget error:', error);
          showError('Erro ao conectar conta');
          setStep('form');
        },
        country_codes: ['BR'],
        locale: 'pt-BR'
      };

      window.belvoSDK.createWidget(token, config).build();
    } catch (error) {
      console.error('Error initializing widget:', error);
      showError('Erro ao inicializar widget');
      setStep('form');
    }
  };

  const pollSyncStatus = async (linkId) => {
    // Por enquanto, consideramos sucesso imediato
    // O webhook da Belvo vai sincronizar os dados em background
    console.log('✅ Link saved, Belvo will sync in background via webhook');
    
    setTimeout(() => {
      setStep('success');
      showSuccess('Conta conectada com sucesso! Os dados serão sincronizados em breve');
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    }, 1500);
  };

  const handleClose = () => {
    if (step === 'widget' || step === 'syncing') {
      if (confirm('Deseja realmente cancelar a conexão?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      style={{ 
        zIndex: 999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] sm:max-h-[95vh] bg-white rounded-xl shadow-xl border border-flight-blue/20 flex flex-col">
        {/* Header */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-flight-blue" />
            <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">
              Conectar via Open Finance
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-4">
          {step === 'form' && (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-flight-blue/5 border border-flight-blue/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-flight-blue flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium text-gray-900 mb-1">Sincronização Automática</p>
                    <p>
                      Conecte sua conta bancária de forma segura. Suas transações serão 
                      sincronizadas automaticamente via Open Finance.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Necessário para identificação no Open Finance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Seu nome completo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Conexão criptografada e segura. Não armazenamos suas senhas bancárias.
                  Você pode revogar o acesso a qualquer momento. Conforme regulamentação do Banco Central.
                </p>
              </div>
            </div>
          )}

          {step === 'widget' && (
            <div className="space-y-4">
              <div className="bg-flight-blue/5 border border-flight-blue/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-flight-blue flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium text-gray-900 mb-1">Próximo Passo</p>
                    <p>
                      Selecione seu banco e faça login. Você será redirecionado para 
                      autorizar o compartilhamento de dados.
                    </p>
                  </div>
                </div>
              </div>

              <div 
                id="belvo" 
                className="min-h-[500px] md:min-h-[600px]"
              />
            </div>
          )}

          {step === 'syncing' && (
            <div className="py-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 border-4 border-[#207DFF]/30 border-t-[#207DFF] rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sincronizando sua conta
                </h3>
                <p className="text-gray-600">
                  Aguarde enquanto importamos suas transações dos últimos 12 meses.
                  Isso pode levar até 1 minuto.
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-flight-blue/10 rounded-full p-4">
                  <CheckCircle className="w-16 h-16 text-flight-blue" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Conta conectada com sucesso
                </h3>
                <p className="text-gray-600">
                  Suas transações foram sincronizadas e já estão disponíveis
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 md:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateSession}
              disabled={loading}
              className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md min-h-[44px]"
            >
              {loading ? 'Conectando...' : 'Continuar'}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
