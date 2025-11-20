import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { X, User, Mail, Phone, CheckCircle, AlertCircle, Sparkles, Rocket, Heart, Zap, TrendingUp, Shield, Star, Home } from 'lucide-react';

export default function InterestListModal({ 
  isOpen, 
  onClose, 
  accountType 
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const [validation, setValidation] = useState({
    name: null,
    email: null,
    phone: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [position, setPosition] = useState(null);
  const [totalCount, setTotalCount] = useState(100);
  const [loadingCount, setLoadingCount] = useState(false);

  // Buscar contador total ao abrir modal
  useEffect(() => {
    if (isOpen && !success) {
      fetchTotalCount();
    }
  }, [isOpen, success]);

  const fetchTotalCount = async () => {
    setLoadingCount(true);
    try {
      const response = await fetch('/api/interested-users/count');
      const data = await response.json();
      
      if (data.success) {
        setTotalCount(data.count);
      }
    } catch (err) {
      console.error('Erro ao buscar contador:', err);
      // Manter 100 como padrão em caso de erro
    } finally {
      setLoadingCount(false);
    }
  };

  // Formatar telefone automaticamente (DDD + número, sem +)
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11); // DDD (2) + número (9)
    
    if (limited.length <= 2) {
      return `(${limited}`;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    // DDD (2) + número (9) = 11 dígitos
    return numbers.length === 11;
  };

  const validateName = (name) => {
    return name.trim().length >= 2;
  };

  const handleChange = (field, value) => {
    if (field === 'phone') {
      const formatted = formatPhone(value);
      setFormData(prev => ({ ...prev, phone: formatted }));
      setValidation(prev => ({ ...prev, phone: validatePhone(formatted) }));
    } else if (field === 'email') {
      setFormData(prev => ({ ...prev, email: value }));
      setValidation(prev => ({ ...prev, email: validateEmail(value) }));
    } else if (field === 'name') {
      setFormData(prev => ({ ...prev, name: value }));
      setValidation(prev => ({ ...prev, name: validateName(value) }));
    }
    
    // Limpar erro ao editar
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validações finais
    if (!validation.name || !validation.email || !validation.phone) {
      setError('Por favor, preencha todos os campos corretamente');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/interested-users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone,
          account_type: accountType
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao salvar seus dados');
      }

      // Sucesso!
      setPosition(data.position);
      setTotalCount(data.position);
      setSuccess(true);
      
    } catch (err) {
      console.error('Erro ao salvar interessado:', err);
      setError(err.message || 'Erro ao salvar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Confetti animation
  useEffect(() => {
    if (success) {
      const confettiCount = 400;
      const colors = ['#207DFF', '#5FFFA7', '#FF6B6B', '#FFD93D', '#A8E6CF'];
      
      for (let i = 0; i < confettiCount; i++) {
        createConfetti(colors);
      }
    }
  }, [success]);

  const createConfetti = (colors) => {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const animationDuration = 2 + Math.random() * 2;
    const size = 8 + Math.random() * 8;
    
    const angle = Math.random() * 360;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const maxDistance = Math.max(screenWidth, screenHeight);
    const velocity = maxDistance * 0.6 + Math.random() * maxDistance * 0.4;
    
    const radians = (angle * Math.PI) / 180;
    const endX = Math.cos(radians) * velocity;
    const endY = Math.sin(radians) * velocity;
    
    confetti.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      opacity: 0.9;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      pointer-events: none;
      z-index: 9999;
      animation: confetti-explode-${angle.toFixed(0)} ${animationDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg);
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes confetti-explode-${angle.toFixed(0)} {
        0% {
          transform: translate(-50%, -50%) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) rotate(${Math.random() * 1080}deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
    
    document.body.appendChild(confetti);
    
    setTimeout(() => {
      confetti.remove();
      styleSheet.remove();
    }, animationDuration * 1000);
  };

  // Resetar formulário quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', email: '', phone: '' });
      setValidation({ name: null, email: null, phone: null });
      setError(null);
      setSuccess(false);
      setPosition(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !success) onClose();
      }}
    >
      {/* Animated Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
      
      {/* Gradient Orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

      {/* Modal Content - CENTRALIZED */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          
          {!success ? (
            <>
              {/* Header */}
              <div className="text-center p-6 border-b border-gray-100">
                <div className="flex items-center justify-center mb-3">
                  <img 
                    src="/images/logo_flat.svg" 
                    alt="MeuAzulão" 
                    className="w-14 h-14"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Estamos quase prontos!
                </h1>
                <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                  A solução estará disponível em breve. Seja um dos primeiros a experimentar!
                </p>
              </div>

              {/* Content - GRID 2 COLUNAS */}
              <div className="grid lg:grid-cols-2 gap-8 p-6">
                {/* COLUNA ESQUERDA - Informações */}
                <div className="space-y-4">
                  {/* Mensagem motivacional - PRIMEIRO */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Rocket className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-gray-900 mb-1">
                          O futuro das suas finanças começa aqui
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Controle absoluto do seu dinheiro com alguns toques. 
                          Registre por voz no WhatsApp e visualize tudo em tempo real.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Features em grid - DEPOIS */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-white rounded-lg sm:rounded-xl border border-blue-100">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-lg sm:rounded-xl flex items-center justify-center mb-1.5 sm:mb-2">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-[10px] sm:text-xs mb-0.5">WhatsApp Nativo</h3>
                      <p className="text-[9px] sm:text-xs text-gray-600">Registre por voz</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-white rounded-lg sm:rounded-xl border border-blue-100">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-lg sm:rounded-xl flex items-center justify-center mb-1.5 sm:mb-2">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-[10px] sm:text-xs mb-0.5">Dashboard Inteligente</h3>
                      <p className="text-[9px] sm:text-xs text-gray-600">Tempo real</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-white rounded-lg sm:rounded-xl border border-blue-100">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-lg sm:rounded-xl flex items-center justify-center mb-1.5 sm:mb-2">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-[10px] sm:text-xs mb-0.5">100% Seguro</h3>
                      <p className="text-[9px] sm:text-xs text-gray-600">Dados protegidos</p>
                    </div>
                  </div>

                  {/* Contador */}
                  <div className="flex items-center justify-center p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl border-2 border-blue-200 shadow-sm">
                    <div className="text-center w-full">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-[10px] sm:text-xs font-bold text-gray-700 min-h-[2.5rem] flex flex-col justify-center">
                        {loadingCount ? (
                          <div className="space-y-1">
                            <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse mx-auto w-12 sm:w-16"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse mx-auto w-16 sm:w-20"></div>
                          </div>
                        ) : (
                          <>
                            <span className="text-blue-600 text-base sm:text-lg block">{totalCount}+</span>
                            <span className="text-gray-600">na lista</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA - Formulário */}
                <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl p-5 border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                    Garantir meu lugar
                  </h3>

                  {/* Formulário */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nome */}
                    <div>
                      <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1.5">
                        Seu Nome *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="name"
                          type="text"
                          placeholder="Como você gostaria de ser chamado?"
                          required
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className={`w-full pl-10 pr-10 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            validation.name === false ? 'border-red-500 bg-red-50' : 
                            validation.name === true ? 'border-blue-500 bg-blue-50' : 
                            'border-gray-300'
                          }`}
                        />
                        {validation.name !== null && (
                          <div className="absolute right-3 top-2.5">
                            {validation.name ? (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {validation.name === false && (
                        <p className="text-xs text-red-600 mt-1">Nome deve ter pelo menos 2 caracteres</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1.5">
                        Seu Email *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          required
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className={`w-full pl-10 pr-10 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            validation.email === false ? 'border-red-500 bg-red-50' : 
                            validation.email === true ? 'border-blue-500 bg-blue-50' : 
                            'border-gray-300'
                          }`}
                        />
                        {validation.email !== null && (
                          <div className="absolute right-3 top-2.5">
                            {validation.email ? (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {validation.email === false && (
                        <p className="text-xs text-red-600 mt-1">Email inválido</p>
                      )}
                    </div>

                    {/* Telefone */}
                    <div>
                      <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1.5">
                        Seu WhatsApp *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          required
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          className={`w-full pl-10 pr-10 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            validation.phone === false ? 'border-red-500 bg-red-50' : 
                            validation.phone === true ? 'border-blue-500 bg-blue-50' : 
                            'border-gray-300'
                          }`}
                        />
                        {validation.phone !== null && (
                          <div className="absolute right-3 top-2.5">
                            {validation.phone ? (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {validation.phone === false && (
                        <p className="text-xs text-red-600 mt-1">Formato: (DDD) NNNNN-NNNN</p>
                      )}
                      {validation.phone === null && (
                        <p className="text-xs text-gray-500 mt-1">Usaremos para avisar quando estiver disponível</p>
                      )}
                    </div>

                    {/* Erro */}
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <p className="text-xs text-red-600">{error}</p>
                      </div>
                    )}

                    {/* Botão Submit */}
                    <button
                      type="submit"
                      disabled={loading || !validation.name || !validation.email || !validation.phone}
                      className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="text-sm">Salvando...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">Quero estar na lista!</span>
                          <Sparkles className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            /* Mensagem de Sucesso */
            <>
              {/* Header com Logo */}
              <div className="text-center p-6 border-b border-gray-100">
                <div className="flex items-center justify-center mb-3">
                  <img 
                    src="/images/logo_flat.svg" 
                    alt="MeuAzulão" 
                    className="w-14 h-14"
                  />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Você está dentro!
                </h2>
                <p className="text-sm text-gray-600">
                  Seja bem-vindo(a) à revolução financeira
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* O que vem a seguir */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <h3 className="font-bold text-gray-900 mb-5 text-sm flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    O que vem a seguir?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center text-center gap-3 p-4 bg-white rounded-lg border border-blue-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-base text-white font-bold">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Notificação no WhatsApp</p>
                        <p className="text-xs text-gray-600">Te avisaremos assim que estiver pronto</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center gap-3 p-4 bg-white rounded-lg border border-blue-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-base text-white font-bold">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Acesso Prioritário</p>
                        <p className="text-xs text-gray-600">Você terá acesso antes de todos</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center gap-3 p-4 bg-white rounded-lg border border-blue-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-base text-white font-bold">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Transformação Financeira</p>
                        <p className="text-xs text-gray-600">Controle suas finanças como nunca</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão de Voltar para Home */}
                <div className="flex justify-center">
                  <button
                    onClick={() => router.push('/')}
                    className="bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3 px-8 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    <span className="text-sm">Voltar para Home</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Fique de olho no seu WhatsApp
                </p>
              </div>
            </>
          )}

          {/* Botão fechar */}
          {!success && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
