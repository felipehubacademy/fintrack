import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { email } = router.query;
  const [resending, setResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/account/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.details || result?.error || 'Não foi possível reenviar o e-mail.');
      }

      setStatusMessage({
        type: 'success',
        text: 'Novo e-mail de confirmação enviado! Verifique sua caixa de entrada (e o spam).'
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Ocorreu um erro ao reenviar o e-mail.'
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Head>
        <title>Confirme seu e-mail - MeuAzulão</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />

        <Link
          href="/login"
          className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors z-10 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Voltar para login</span>
        </Link>

        <div className="relative z-10 w-full max-w-xl">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">Confirme seu e-mail</h1>
              <p className="mt-3 text-gray-600">
                Enviamos um link de confirmação para <strong>{email || 'seu e-mail'}</strong>. Abra o e-mail e finalize a confirmação para acessar sua conta.
              </p>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <p>Não recebeu o e-mail?</p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>Verifique a caixa de spam ou promoções.</li>
                <li>Confirme se digitou o e-mail corretamente.</li>
              </ul>
            </div>

            {statusMessage && (
              <div
                className={`p-4 rounded-xl border ${
                  statusMessage.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <p className="text-sm">{statusMessage.text}</p>
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={!email || resending}
              className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
            >
              {resending ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Reenviando...
                </span>
              ) : (
                'Reenviar e-mail de confirmação'
              )}
            </button>

            <p className="text-xs text-gray-500">
              Depois de confirmar o e-mail, faça login normalmente com as credenciais escolhidas.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}


