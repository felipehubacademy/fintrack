import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, CheckCircle, AlertCircle, Sparkles, Rocket, Heart, Zap, TrendingUp, Shield, Star } from 'lucide-react';

export default function InterestListModal({ 
  isOpen, 
  onClose, 
  accountType 
}) {
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

  const accountTypeLabel = accountType === 'solo' ? 'Uso Individual' : 'Uso em Família';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !success) onClose();
      }}
    >
      {/* MESMO BACKGROUND DA LANDING E ACCOUNT-TYPE */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50 opacity-95" />
      
      {/* Animated Background Grid - IGUAL */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
      
      {/* Gradient Orbs - IGUAIS */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

      {/* Modal Content - MAIS LARGO NO DESKTOP COM SCROLL */}
      <div className="relative z-10 w-full max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          
          {!success ? (
            <>
              {/* Header */}
              <div className="text-center p-6 sm:p-8">
                <div className="inline-flex items-center justify-center mb-4">
                  <img 
                    src="/images/logo_flat.svg" 
                    alt="MeuAzulão" 
                    className="w-12 h-12"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  Estamos quase prontos para revolucionar suas finanças! 🚀
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mb-2">
                  A solução estará disponível em breve. Seja um dos primeiros a experimentar!
                </p>
              </div>

              {/* Content */}
              <div className="px-6 sm:px-8 pb-8">
                {/* Features em grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-2xl flex items-center justify-center mb-2">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs mb-1">WhatsApp Nativo</h3>
                    <p className="text-xs text-gray-600">Registre por voz</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-2xl flex items-center justify-center mb-2">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs mb-1">Dashboard Inteligente</h3>
                    <p className="text-xs text-gray-600">Tempo real</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-2xl flex items-center justify-center mb-2">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs mb-1">100% Seguro</h3>
                    <p className="text-xs text-gray-600">Dados protegidos</p>
                  </div>
                </div>

                {/* Mensagem motivacional */}
                <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-200">
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

                {/* Contador */}
                <div className="mb-5 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-blue-200 shadow-lg">
                    <Heart className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-gray-700">
                      {loadingCount ? (
                        'Carregando...'
                      ) : (
                        <>
                          <span className="text-blue-600 text-lg">{totalCount}+</span> pessoas na lista
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Tipo de conta */}
                <div className="mb-5 p-3 bg-gradient-to-r from-blue-500 to-[#0D2C66] rounded-xl">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <p className="text-xs opacity-90 mb-1">Você escolheu</p>
                      <p className="text-base font-bold">{accountTypeLabel}</p>
                    </div>
                    <User className="w-6 h-6 opacity-90" />
                  </div>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-3">
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
                        className={`w-full pl-9 pr-9 py-2.5 text-sm border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                          validation.name === false ? 'border-red-500 bg-red-50' : 
                          validation.name === true ? 'border-green-500 bg-green-50' : 
                          'border-gray-300'
                        }`}
                      />
                      {validation.name !== null && (
                        <div className="absolute right-3 top-2.5">
                          {validation.name ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
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
                        className={`w-full pl-9 pr-9 py-2.5 text-sm border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                          validation.email === false ? 'border-red-500 bg-red-50' : 
                          validation.email === true ? 'border-green-500 bg-green-50' : 
                          'border-gray-300'
                        }`}
                      />
                      {validation.email !== null && (
                        <div className="absolute right-3 top-2.5">
                          {validation.email ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
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
                        className={`w-full pl-9 pr-9 py-2.5 text-sm border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                          validation.phone === false ? 'border-red-500 bg-red-50' : 
                          validation.phone === true ? 'border-green-500 bg-green-50' : 
                          'border-gray-300'
                        }`}
                      />
                      {validation.phone !== null && (
                        <div className="absolute right-3 top-2.5">
                          {validation.phone ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
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
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Botão Submit - MESMO ESTILO DA LANDING */}
                  <button
                    type="submit"
                    disabled={loading || !validation.name || !validation.email || !validation.phone}
                    className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
            </>
          ) : (
            /* Mensagem de Sucesso */
            <div className="text-center py-8 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Você está dentro! 🎉
              </h3>
              
              <p className="text-sm text-gray-600 mb-5">
                Seus dados foram salvos com sucesso!
              </p>

              <div className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 mb-6">
                <Rocket className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-bold text-gray-700">
                  Você é a pessoa <span className="text-blue-600 text-xl">#{position}</span> na fila!
                </span>
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 mb-6 text-left max-w-md mx-auto">
                <h4 className="font-bold text-gray-900 mb-3 text-center text-sm">O que vem a seguir?</h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">1</span>
                    </div>
                    <p className="text-xs text-gray-700">Te avisaremos no WhatsApp assim que estiver pronto</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">2</span>
                    </div>
                    <p className="text-xs text-gray-700">Você terá acesso prioritário no lançamento</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">3</span>
                    </div>
                    <p className="text-xs text-gray-700">Prepare-se para revolucionar suas finanças</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-3 px-6 text-sm rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                Perfeito, estou ansioso!
              </button>

              <p className="text-xs text-gray-500 mt-4">
                Fique de olho no seu WhatsApp 👀
              </p>
            </div>
          )}

          {/* Botão fechar */}
          {!success && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
