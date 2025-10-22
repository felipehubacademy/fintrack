import { useState, useEffect } from 'react';
import { Smartphone, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function VerificationModal({ user, onVerified }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCode = async () => {
    try {
      setSending(true);
      setMessage('');
      setIsError(false);

      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userPhone: user.phone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código');
      }

      setMessage('Código enviado! Verifique seu WhatsApp');
      setCountdown(60); // 1 minuto antes de poder enviar novamente

      // Em desenvolvimento, mostrar o código no console
      if (data.code) {
        console.log('📱 Código de verificação:', data.code);
      }

    } catch (error) {
      console.error('Erro ao enviar código:', error);
      setMessage(error.message);
      setIsError(true);
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setMessage('Digite um código de 6 dígitos');
      setIsError(true);
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      setIsError(false);

      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          code: code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
      }

      setMessage('WhatsApp verificado com sucesso!');
      setIsError(false);
      
      // Aguardar 1 segundo antes de chamar callback
      setTimeout(() => {
        if (onVerified) onVerified();
      }, 1000);

    } catch (error) {
      console.error('Erro ao verificar código:', error);
      setMessage(error.message);
      setIsError(true);
      setCode(''); // Limpar código inválido
    } finally {
      setLoading(false);
    }
  };

  // Auto-enviar código ao montar o componente
  useEffect(() => {
    sendCode();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verificar WhatsApp
          </h2>
          <p className="text-gray-600 text-sm">
            Enviamos um código de 6 dígitos para <span className="font-semibold">{user.phone}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={verifyCode} className="space-y-6">
          {/* Code Input */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Código de Verificação
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-center text-2xl font-mono tracking-widest"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Digite o código de 6 dígitos recebido no WhatsApp
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-xl ${
              isError 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center space-x-2">
                {isError ? (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                <p className={`text-sm ${isError ? 'text-red-800' : 'text-green-800'}`}>
                  {message}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Verificando...
              </span>
            ) : (
              'Verificar Código'
            )}
          </button>

          {/* Resend Button */}
          <button
            type="button"
            onClick={sendCode}
            disabled={sending || countdown > 0}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-gray-50 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Enviando...
              </>
            ) : countdown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reenviar em {countdown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Enviar Novo Código
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">
                Não recebeu o código?
              </p>
              <p className="text-xs text-blue-700">
                Verifique se o número {user.phone} está correto e se você tem WhatsApp ativo. Aguarde até 2 minutos antes de solicitar novo código.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Precisamos verificar seu WhatsApp para enviar notificações e permitir que você converse com o Zul
          </p>
        </div>
      </div>
    </div>
  );
}

