import { useState, useEffect } from 'react';
import { MessageCircle, Smartphone, CheckCircle, AlertCircle, Send, Shield } from 'lucide-react';

export default function WhatsAppStep({ user, onComplete, onDataChange }) {
  const [phone, setPhone] = useState(user?.phone || '');
  const [isVerified, setIsVerified] = useState(user?.phone_verified || false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationStep(1);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return phone;
  };

  const handleCodePaste = async (e) => {
    const pastedText = e.clipboardData.getData('text');
    const numbers = pastedText.replace(/\D/g, '').slice(0, 6);
    if (numbers.length === 6) {
      setVerificationCode(numbers);
      // Auto-verify after paste
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
          phone: phone.replace(/\D/g, ''), 
          code: code 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
      }

      setIsVerified(true);
      if (onDataChange) {
        onDataChange({ phone_verified: true, phone });
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
  };

  const handleSendCode = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 11) {
      setError('Digite um telefone válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, '') })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código');
      }

      setCodeSent(true);
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    await verifyCode();
  };

  const handleComplete = () => {
    if (!isVerified) {
      setError('Por favor, verifique seu telefone primeiro');
      return;
    }
    onComplete();
  };

  const conversationSteps = [
    { speaker: 'user', message: 'Gastei 50 no mercado' },
    { speaker: 'zul', message: 'Pagou como?' },
    { speaker: 'user', message: 'PIX' },
    { speaker: 'zul', message: 'Pronto! Despesa registrada ✅' }
  ];

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (animationStep >= 1) {
      const delays = [0, 1000, 2000, 3000];
      conversationSteps.forEach((step, index) => {
        setTimeout(() => {
          setCurrentStep(index + 1);
        }, delays[index]);
      });
    }
  }, [animationStep]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className={`
          w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6
          shadow-2xl shadow-green-500/30
          transform transition-all duration-700 ease-out
          ${animationStep >= 1 ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}
        `}>
          <MessageCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Conheça o Zul
        </h2>
        <p className="text-white/80 text-lg">
          Seu assistente financeiro pessoal via WhatsApp
        </p>
      </div>

      {/* WhatsApp Demo */}
      <div className={`
        max-w-lg mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden
        transform transition-all duration-700 ease-out delay-300
        ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        {/* WhatsApp Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
            <MessageCircle className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Zul - MeuAzulão</h3>
            <p className="text-green-100 text-sm">online</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="p-6 space-y-4 min-h-[240px] bg-[#ECE5DD]">
          {conversationSteps.slice(0, currentStep).map((step, index) => (
            <div
              key={index}
              className={`
                flex ${step.speaker === 'user' ? 'justify-end' : 'justify-start'}
                animate-[fadeIn_0.5s_ease-out]
              `}
            >
              <div
                className={`
                  max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-md
                  ${step.speaker === 'user'
                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none'
                  }
                `}
              >
                {step.message}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className={`
        grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto
        transform transition-all duration-700 ease-out delay-500
        ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-300" />
            </div>
            <h3 className="font-semibold text-white">Conversa Natural</h3>
          </div>
          <p className="text-sm text-white/70">
            Registre despesas conversando naturalmente, como se fosse com um amigo
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-300" />
            </div>
            <h3 className="font-semibold text-white">Inteligência Artificial</h3>
          </div>
          <p className="text-sm text-white/70">
            Zul entende o contexto e preenche automaticamente os dados
          </p>
        </div>
      </div>

      {/* Phone Verification */}
      {!isVerified ? (
        <div className={`
          max-w-md mx-auto space-y-6
          transform transition-all duration-700 ease-out delay-700
          ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Verificar WhatsApp</h3>
                <p className="text-white/70 text-sm">Enviaremos um código de 6 dígitos</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-400/30 rounded-xl flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {!codeSent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Número do WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={loading || !phone || phone.replace(/\D/g, '').length < 11}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Send className="w-5 h-5" />
                  <span>{loading ? 'Enviando...' : 'Enviar Código'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Código de Verificação
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onPaste={handleCodePaste}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-white/60 text-sm mt-3 text-center">
                    Enviamos um código para <span className="font-semibold text-white">{phone}</span>
                  </p>
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3 mt-3">
                    <p className="text-white/80 text-xs text-center">
                      💡 Toque em "Copiar código" no WhatsApp e cole aqui
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{loading ? 'Verificando...' : 'Verificar Código'}</span>
                </button>
                {countdown > 0 ? (
                  <p className="text-white/60 text-sm text-center">
                    Reenviar código em {countdown}s
                  </p>
                ) : (
                  <button
                    onClick={() => {
                      setCodeSent(false);
                      setVerificationCode('');
                      setError(null);
                    }}
                    className="w-full px-4 py-2 text-white/70 hover:text-white text-sm transition-colors"
                  >
                    Reenviar código
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`
          max-w-md mx-auto text-center space-y-6
          transform transition-all duration-500 ease-out
          ${isVerified ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}>
          <div className="bg-green-500/20 backdrop-blur-xl border border-green-400/30 rounded-2xl p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              WhatsApp Verificado!
            </h3>
            <p className="text-white/80">
              Agora você pode registrar despesas conversando com o Zul
            </p>
          </div>
          <button
            onClick={handleComplete}
            className="w-full flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <span>Continuar</span>
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
