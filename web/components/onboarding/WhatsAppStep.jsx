import { useState, useEffect } from 'react';
import { MessageCircle, Smartphone, CheckCircle, AlertCircle, Send, Shield, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';

export default function WhatsAppStep({ user, onComplete, onDataChange }) {
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
      
      console.log('📱 Enviando código para:', phoneWithCountryCode);
      console.log('👤 User ID:', user?.id);
      
      // Se o número é diferente do cadastrado, atualizar no banco primeiro
      if (registeredPhone && phone.replace(/\D/g, '') !== registeredPhone.replace(/\D/g, '')) {
        console.log('🔄 Atualizando telefone no banco...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            phone: phoneWithCountryCode,
            phone_verified: false // Reset verification status
          })
          .eq('id', user?.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar telefone:', updateError);
          throw new Error('Erro ao atualizar telefone');
        }
        
        console.log('✅ Telefone atualizado no banco');
        // Atualizar o número registrado no estado local
        setRegisteredPhone(phone.replace(/\D/g, ''));
      }

      console.log('📤 Enviando requisição para /api/send-verification-code');
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          userPhone: phoneWithCountryCode
        })
      });

      console.log('📥 Status da resposta:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Resposta não-OK:', text);
        throw new Error(`Erro ${response.status}: ${text}`);
      }

      const data = await response.json();
      console.log('✅ Resposta da API:', data);

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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
          Conheça o Zul 🤖
        </h2>
        <p className="text-gray-600 text-lg xl:text-xl">
          Seu assistente financeiro pessoal via WhatsApp
        </p>
      </div>

      {/* Main Content - WhatsApp Demo + Verification Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-stretch">
        {/* WhatsApp Demo */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
          {/* WhatsApp Header */}
          <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-3 flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg p-0.5">
              <Image 
                src="/images/logo_flat.svg" 
                alt="Zul" 
                width={36}
                height={36}
                className="w-9 h-9"
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-base xl:text-lg">Zul - MeuAzulão</h3>
              <p className="text-green-100 text-xs xl:text-sm">online</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-4 space-y-3 flex-1 bg-[#ECE5DD]">
            <div className="flex justify-start">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-white text-gray-800 rounded-bl-none">
                Olá! 👋 Sou o Zul, seu assistente financeiro. Pode me enviar suas despesas por aqui!
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-gradient-to-br from-[#DCF8C6] to-[#D1F4CC] text-gray-800 rounded-br-none">
                Gastei R$ 45 no mercado hoje
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-white text-gray-800 rounded-bl-none">
                ✅ Registrado! <strong>R$ 45,00</strong> em <strong>Mercado</strong><br/>
                Deseja adicionar mais detalhes?
              </div>
            </div>
          </div>
        </div>

        {/* Phone Verification Section */}
        {!isVerified ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 xl:p-6 shadow-lg flex flex-col justify-center">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 bg-[#207DFF]/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#207DFF]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  Verificar WhatsApp
                </h3>
                <p className="text-gray-600 text-sm">
                  Conecte seu número
                </p>
              </div>
            </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {warning && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-yellow-800 text-sm">{warning}</p>
            </div>
          )}

            {/* Phone Input */}
            {!codeSent ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Número do WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
                  />
                  {registeredPhone && phone.replace(/\D/g, '') === registeredPhone.replace(/\D/g, '') && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Este é o número cadastrado na sua conta
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSendCode}
                  disabled={loading || !phone || phone.replace(/\D/g, '').length < 11}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Enviando...' : 'Enviar Código'}</span>
                </button>

                {!registeredPhone && (
                  <p className="text-gray-600 text-xs text-center">
                    💡 Digite apenas DDD + número. Ex: (11) 97822-9898
                  </p>
                )}
              </div>
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
          </div>
        ) : (
          <div className="bg-white border border-green-200 rounded-2xl p-6 shadow-lg flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              WhatsApp Verificado! 🎉
            </h3>
            <p className="text-gray-600 text-sm">
              Agora você pode conversar com o Zul pelo número{' '}
              <span className="font-semibold text-[#25D366] block mt-1">{phone}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
