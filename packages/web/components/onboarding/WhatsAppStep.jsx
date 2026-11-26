import { useState, useEffect } from 'react';
import { MessageCircle, Smartphone, CheckCircle, AlertCircle, Send, Shield, Sparkles, Lightbulb, X } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';
import ZulFloatingButton from '../ZulFloatingButton';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { useI18n } from '../../contexts/I18nContext';

export default function WhatsAppStep({ user, onComplete, onDataChange }) {
  const { t } = useI18n();
  const [showZulCard, setShowZulCard] = useState(false);
  
  // Mostrar card com delay para sincronizar com ZulFloatingButton
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowZulCard(true);
    }, 1500); // Delay para sincronizar com o Zul
    
    return () => clearTimeout(timer);
  }, []);
  
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
      setError(t('web.whatsAppStep.enterThe6DigitCode'));
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
        throw new Error(data.error || t('web.shared.invalidCode'));
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
      setWarning(t('web.whatsAppStep.thisNumberIsDifferentFrom'));
    } else {
      setWarning(null);
    }
  };

  const handleSendCode = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 11) {
      setError(t('web.whatsAppStep.enterAValidPhoneNumber'));
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
      
      console.log('📱 Enviando código para:', phoneWithCountryCode);
      console.log('👤 User ID:', user?.id);
      
      // Se o número é diferente do cadastrado, atualizar no banco primeiro
      if (registeredPhone && normalizedPhone !== registeredPhone.replace(/\D/g, '')) {
        console.log('🔄 Atualizando telefone no banco...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            phone: phoneWithCountryCode, // Salvar com código do país: 5511999999999
            phone_verified: false // Reset verification status
          })
          .eq('id', user?.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar telefone:', updateError);
          throw new Error(t('web.whatsAppStep.couldnTUpdateYourPhone'));
        }
        
        console.log('✅ Telefone atualizado no banco');
        // Atualizar o número registrado no estado local
        setRegisteredPhone(phoneWithCountryCode);
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
      
      const data = await response.json();
      console.log('✅ Resposta da API:', data);

      if (!response.ok) {
        // Tratamento especial para rate limit (429)
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          const minutes = Math.ceil(retryAfter / 60);
          
          if (minutes >= 60) {
            const hours = Math.ceil(minutes / 60);
            setError(`⏰ Muitas tentativas. Aguarde ${hours} hora${hours > 1 ? 's' : ''} para tentar novamente.`);
          } else if (minutes > 1) {
            setError(t('web.whatsAppStep.tooManyTriesWaitMinutes', { minutes }));
          } else {
            setError(t('web.whatsAppStep.waitSecondsAndTryAgain', { retryAfter }));
          }
          
          // Setar countdown automático baseado no retryAfter
          setCountdown(retryAfter);
        } else {
          setError(data.error || t('web.whatsAppStep.couldnTSendTheCode', { status: response.status }));
        }
        return;
      }

      setCodeSent(true);
      setCountdown(60);
      setVerificationCode(''); // Limpar código anterior ao reenviar
    } catch (err) {
      console.error('❌ Erro na requisição:', err);
      setError(err.message || t('web.whatsAppStep.couldnTSendTheCode2'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Zul Button - Same as in the main app */}
      <ZulFloatingButton />
      
      {/* Zul Info Card */}
      {showZulCard && (
        <div className="fixed bottom-28 right-28 w-80 z-50 pointer-events-auto animate-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-lg border border-gray-200 bg-white relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowZulCard(false)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-100 hover:bg-gray-200 z-10"
            >
              <X className="h-3 w-3 text-gray-500" />
            </Button>
            
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-12 h-12 bg-[#207DFF] rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{t('web.whatsAppStep.iMZul')}</h4>
                  <p className="text-xs text-gray-600">{t('web.whatsAppStep.yourMoneyAssistant')}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-[#207DFF] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      {t('web.whatsAppStep.textMeYourExpensesOn')}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-[#207DFF] flex-shrink-0" />
                    <span>{t('web.whatsAppStep.expensesLoggedForYou')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-[#207DFF] flex-shrink-0" />
                    <span>{t('web.whatsAppStep.clearCharts')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-[#207DFF] flex-shrink-0" />
                    <span>{t('web.whatsAppStep.billReminders')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-[#207DFF] flex-shrink-0" />
                    <span>{t('web.whatsAppStep.andMore')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
            {t('web.whatsAppStep.meetZul')}
          </h2>
          <p className="text-gray-600 text-lg xl:text-xl">
            {t('web.whatsAppStep.yourMoneyAssistantOnWhatsapp')}
          </p>
        </div>

      {/* Main Content - WhatsApp Demo + Verification Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-stretch">
        {/* WhatsApp Demo */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
          {/* WhatsApp Header */}
          <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-3 flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Image 
                src="/images/logo_flat.svg" 
                alt="Zul" 
                width={28}
                height={28}
                className="w-7 h-7"
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-base xl:text-lg">{t('web.whatsAppStep.zulMeuazulao')}</h3>
              <p className="text-green-100 text-xs xl:text-sm">{t('web.whatsAppStep.online')}</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-4 space-y-3 flex-1 bg-[#ECE5DD]">
            <div className="flex justify-start">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-white text-gray-800 rounded-bl-none">
                {t('web.whatsAppStep.hiIMZulYour')}
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-gradient-to-br from-[#DCF8C6] to-[#D1F4CC] text-gray-800 rounded-br-none">
                {t('web.whatsAppStep.groceries45')}
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-white text-gray-800 rounded-bl-none">
                {t('web.whatsAppStep.logged')} <strong>R$ 45,00</strong> {t('web.shared.at')} <strong>{t('web.whatsAppStep.groceries')}</strong><br/>
                {t('web.whatsAppStep.wantToAddMoreDetails')}
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
                  {t('web.shared.verifyWhatsapp')}
                </h3>
                <p className="text-gray-600 text-sm">
                  {t('web.whatsAppStep.connectYourNumber')}
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
                    {t('web.whatsAppStep.whatsappNumber')}
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
                      {t('web.whatsAppStep.thisIsTheNumberOn')}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSendCode}
                  disabled={loading || !phone || phone.replace(/\D/g, '').length < 11}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? t('web.shared.sending') : t('web.whatsAppStep.sendCode')}</span>
                </button>

                {!registeredPhone && (
                  <p className="text-gray-600 text-xs text-center">
                    {t('web.whatsAppStep.includeYourCountryCodeE')}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    {t('web.shared.verificationCode')}
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
                  <span>{loading ? t('web.shared.checking') : t('web.whatsAppStep.verify')}</span>
                </button>

                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="w-full text-xs text-gray-600 hover:text-gray-900 disabled:text-gray-400 transition-colors"
                >
                  {countdown > 0 
                    ? t('web.shared.resendInS', { countdown }) 
                    : t('web.whatsAppStep.resendCode')
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
              {t('web.whatsAppStep.whatsappVerified')}
            </h3>
            <p className="text-gray-600 text-sm">
              {t('web.whatsAppStep.youCanNowChatWith')}
              <span className="font-semibold text-[#25D366] block mt-1">{phone}</span>
            </p>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
