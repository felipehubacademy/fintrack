import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, AlertCircle, Send, X, Smartphone, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function WhatsAppVerificationModal({ 
  isOpen, 
  onClose, 
  user, 
  onVerified 
}) {
  // Remove formatação do telefone do usuário para exibição
  const normalizePhone = (phone) => {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    // Se começa com 55 e tem mais de 11 dígitos, remove o 55
    if (numbers.startsWith('55') && numbers.length > 11) {
      return numbers.substring(2);
    }
    return numbers;
  };
  
  const userPhoneNormalized = normalizePhone(user?.phone);
  
  const [phone, setPhone] = useState(userPhoneNormalized ? formatPhone(userPhoneNormalized) : '');
  const [registeredPhone, setRegisteredPhone] = useState(userPhoneNormalized);
  const [isVerified, setIsVerified] = useState(user?.phone_verified || false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState(1); // 1: phone, 2: code, 3: success
  
  // Função de formatação precisa estar disponível antes do useState
  function formatPhone(value) {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');
    
    // Remove o código do país se foi digitado (55)
    if (numbers.startsWith('55') && numbers.length > 11) {
      numbers = numbers.substring(2);
    }
    
    // Limita a 11 dígitos (DDD + número)
    numbers = numbers.slice(0, 11);
    
    // Formata: (11) 99999-9999
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    return numbers;
  }

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setPhone(userPhoneNormalized ? formatPhone(userPhoneNormalized) : '');
      setRegisteredPhone(userPhoneNormalized);
      setIsVerified(user?.phone_verified || false);
      setVerificationCode('');
      setCodeSent(false);
      setError(null);
      setWarning(null);
      setCountdown(0);
      setStep(user?.phone_verified ? 3 : 1);
    }
  }, [isOpen, user]);

  const handleCodePaste = async (e) => {
    const pastedText = e.clipboardData.getData('text');
    const numbers = pastedText.replace(/\D/g, '').slice(0, 6);
    if (numbers.length === 6) {
      setVerificationCode(numbers);
      setTimeout(async () => {
        await verifyCode(numbers);
      }, 300);
    }
  };

  const verifyCode = async (code = verificationCode) => {
    if (!code || code.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          code: code 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
      }

      setIsVerified(true);
      setStep(3);
      if (onVerified) {
        onVerified();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError(null);
    
    // Verificar se o número é diferente do cadastrado
    if (registeredPhone && formatted.replace(/\D/g, '') !== registeredPhone.replace(/\D/g, '') && formatted.replace(/\D/g, '').length === 11) {
      setWarning('Este número é diferente do seu cadastro. Ao enviar o código, seu número será atualizado automaticamente.');
    } else {
      setWarning(null);
    }
  };

  const handleSendCode = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 11) {
      setError('Digite um telefone válido');
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      // Normalizar telefone (apenas números)
      const normalizedPhone = phone.replace(/\D/g, '');
      
      // Garantir que comece com 55 (código do Brasil)
      const phoneWithCountryCode = normalizedPhone.startsWith('55') 
        ? normalizedPhone 
        : normalizedPhone;
      
      // Se o número é diferente do cadastrado, atualizar no banco primeiro
      if (registeredPhone && normalizedPhone !== registeredPhone.replace(/\D/g, '')) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            phone: phoneWithCountryCode, // Salvar com código do país: 5511999999999
            phone_verified: false // Reset verification status
          })
          .eq('id', user?.id);

        if (updateError) {
          throw new Error('Erro ao atualizar telefone');
        }
        
        // Atualizar o número registrado no estado local
        setRegisteredPhone(phoneWithCountryCode);
      }

      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          userPhone: phoneWithCountryCode
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro ${response.status}: ${text}`);
      }

      const data = await response.json();
      setCodeSent(true);
      setStep(2);
      setCountdown(60); // 60 segundos para reenviar
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6 space-x-2">
            <div className={`w-2 h-2 rounded-full transition-all ${step >= 1 ? 'bg-[#25D366] w-8' : 'bg-gray-300'}`}></div>
            <div className={`w-2 h-2 rounded-full transition-all ${step >= 2 ? 'bg-[#25D366] w-8' : 'bg-gray-300'}`}></div>
            <div className={`w-2 h-2 rounded-full transition-all ${step >= 3 ? 'bg-[#25D366] w-8' : 'bg-gray-300'}`}></div>
          </div>

          {/* Header Content */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                step === 3 ? 'bg-gradient-to-br from-green-400 to-green-600 animate-pulse' : 'bg-gradient-to-br from-green-400 to-green-600'
              }`}>
                {step === 3 ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <MessageCircle className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 1 && 'Verificar WhatsApp'}
              {step === 2 && 'Digite o Código'}
              {step === 3 && 'Tudo Pronto!'}
            </h2>
            <p className="text-gray-600">
              {step === 1 && 'Informe seu número para conversar com o Zul'}
              {step === 2 && 'Enviamos um código de 6 dígitos no WhatsApp'}
              {step === 3 && 'Seu WhatsApp está verificado e pronto para uso'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 3 ? (
            /* Success State */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <p className="text-green-900 font-semibold mb-2">
                    WhatsApp Verificado com Sucesso!
                  </p>
                  <p className="text-green-700 text-sm">
                    Número: <span className="font-mono font-semibold">{phone}</span>
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-900 text-sm font-medium mb-1">
                      Agora você pode usar o Zul!
                    </p>
                    <p className="text-blue-700 text-xs">
                      Envie mensagens via WhatsApp para registrar despesas, ver relatórios e muito mais.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Entendido
              </button>
            </div>
          ) : step === 2 ? (
            /* Code Input State */
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              {/* Code Input */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-3 text-center">
                  Código de Verificação
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  onPaste={handleCodePaste}
                  maxLength={6}
                  autoFocus
                  className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-900 text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-center text-xs text-gray-500 mt-2">
                  Código enviado para <span className="font-semibold text-gray-700">{phone}</span>
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-in shake duration-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Verify Button */}
              <button
                onClick={() => verifyCode()}
                disabled={loading || verificationCode.length !== 6}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Verificar Código</span>
                  </>
                )}
              </button>

              {/* Resend Button */}
              <div className="text-center">
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 transition-colors font-medium"
                >
                  {countdown > 0 ? (
                    <span className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>Reenviar em {countdown}s</span>
                    </span>
                  ) : (
                    'Não recebeu? Reenviar código'
                  )}
                </button>
              </div>

              {/* Back Button */}
              <button
                onClick={() => {
                  setStep(1);
                  setCodeSent(false);
                  setVerificationCode('');
                  setError(null);
                }}
                className="w-full text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                ← Voltar para o número
              </button>
            </div>
          ) : (
            /* Phone Input State */
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
              {/* Phone Input */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span>Número do WhatsApp</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    autoFocus
                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                </div>
                {warning && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-800 text-xs flex items-start">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-in shake duration-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Send Code Button */}
              <button
                onClick={handleSendCode}
                disabled={loading || !phone || phone.replace(/\D/g, '').length < 11}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Código</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-blue-900 text-sm font-semibold mb-1">
                      Como funciona?
                    </p>
                    <p className="text-blue-700 text-xs leading-relaxed">
                      Enviaremos um código de 6 dígitos via WhatsApp. Você terá 10 minutos para validá-lo e começar a usar o Zul.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
