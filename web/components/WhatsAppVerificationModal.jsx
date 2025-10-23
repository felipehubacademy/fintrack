import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, AlertCircle, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function WhatsAppVerificationModal({ 
  isOpen, 
  onClose, 
  user, 
  onVerified 
}) {
  // Remove o +55 do telefone do usuário para exibição
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
      const phoneWithCountryCode = '55' + phone.replace(/\D/g, '');
      
      // Se o número é diferente do cadastrado, atualizar no banco primeiro
      if (registeredPhone && phone.replace(/\D/g, '') !== registeredPhone.replace(/\D/g, '')) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            phone: phoneWithCountryCode,
            phone_verified: false // Reset verification status
          })
          .eq('id', user?.id);

        if (updateError) {
          throw new Error('Erro ao atualizar telefone');
        }
        
        // Atualizar o número registrado no estado local
        setRegisteredPhone(phone.replace(/\D/g, ''));
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
      setCountdown(60); // 60 segundos para reenviar
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Verificar WhatsApp
              </h2>
              <p className="text-sm text-gray-600">
                {isVerified ? 'WhatsApp verificado' : 'Confirme seu número'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isVerified ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                WhatsApp Verificado! 🎉
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Seu número <span className="font-semibold text-[#25D366]">{phone}</span> está verificado e você pode conversar com o Zul.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-[#207DFF] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#207DFF]/90 transition-colors"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Phone Input */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Número do WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
                />
                {warning && (
                  <p className="text-amber-600 text-xs mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {warning}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-800 text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                  </p>
                </div>
              )}

              {/* Verification Code Input */}
              {!codeSent ? (
                <button
                  onClick={handleSendCode}
                  disabled={loading || !phone || phone.replace(/\D/g, '').length < 11}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Enviando...' : 'Enviar Código'}</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Código de Verificação
                    </label>
                    <input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onPaste={handleCodePaste}
                      maxLength={6}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-center text-xl font-mono tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={() => verifyCode()}
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{loading ? 'Verificando...' : 'Verificar'}</span>
                  </button>

                  <button
                    onClick={handleSendCode}
                    disabled={countdown > 0 || loading}
                    className="w-full text-xs text-gray-600 hover:text-gray-900 disabled:text-gray-400 transition-colors"
                  >
                    {countdown > 0 
                      ? `Reenviar em ${countdown}s` 
                      : 'Reenviar código'
                    }
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-800 text-sm">
                  <strong>💡 Dica:</strong> O código será enviado via WhatsApp para o número informado. 
                  Verifique se o número está correto antes de enviar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
