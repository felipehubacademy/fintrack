import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useDynamicUrls } from '../hooks/useDynamicUrls';
import { useI18n } from '../contexts/I18nContext';

export default function UpdatePassword() {
  const { t } = useI18n();
  const router = useRouter();
  const { getDynamicUrl } = useDynamicUrls();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Validar se há sessão de recuperação
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage(t('web.shared.passwordsDonTMatch'));
      setIsError(true);
      return;
    }

    if (password.length < 8) {
      setMessage(t('web.updatePassword.passwordMustHaveAtLeast'));
      setIsError(true);
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      setIsError(false);

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage(t('web.updatePassword.passwordUpdatedRedirecting'));
      setIsError(false);
      
      setTimeout(() => {
        router.push(getDynamicUrl('/dashboard'));
      }, 2000);
    } catch (error) {
      setMessage(error.message || t('web.updatePassword.couldnTUpdateYourPassword'));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('web.updatePassword.updatePasswordMeuazulao')}</title>
        <meta name="description" content="Atualize sua senha no MeuAzulão" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

        {/* Update Password Card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-200">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-6">
                <img 
                  src="/images/logo_flat.svg" 
                  alt="MeuAzulão" 
                  className="w-16 h-16"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('web.updatePassword.newPassword')}
              </h1>
              <p className="text-gray-600">
                {t('web.updatePassword.enterYourNewPassword')}
              </p>
            </div>

            {/* Update Form */}
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('web.updatePassword.newPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('web.shared.atLeast8Characters')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('web.shared.atLeast8Characters')}
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('web.updatePassword.confirmNewPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t('web.shared.typeThePasswordAgain')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    {t('web.updatePassword.updating')}
                  </span>
                ) : (
                  t('web.updatePassword.updatePassword')
                )}
              </button>
            </form>

            {/* Message */}
            {message && (
              <div className={`mt-6 p-4 rounded-xl ${isError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center space-x-3">
                  {!isError && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  <p className={`text-sm ${isError ? 'text-red-800' : 'text-green-800'} text-center flex-1`}>
                    {message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

