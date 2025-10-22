import { Sparkles, TrendingUp, Users, Shield } from 'lucide-react';

export default function WelcomeStep({ user, organization, onNext }) {
  const features = [
    {
      icon: TrendingUp,
      title: 'Controle Total',
      description: 'Visualize todas suas despesas em tempo real'
    },
    {
      icon: Users,
      title: 'Família Conectada',
      description: 'Todos registram despesas em um só lugar'
    },
    {
      icon: Sparkles,
      title: 'Zul, seu Assistente',
      description: 'Registre despesas conversando no WhatsApp'
    },
    {
      icon: Shield,
      title: '100% Seguro',
      description: 'Seus dados protegidos com criptografia'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto text-center space-y-8">
      {/* Logo e Welcome */}
      <div className="space-y-6">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl backdrop-blur-xl border border-white/20 mb-4">
          <img 
            src="/images/logo_flat.svg" 
            alt="MeuAzulão" 
            className="w-16 h-16"
          />
        </div>
        
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Bem-vindo, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Vamos configurar o <span className="font-semibold text-blue-300">{organization?.name}</span> em poucos minutos
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4 pt-8">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-left hover:bg-white/15 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-white/70 text-sm">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 rounded-2xl p-6 mt-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Sparkles className="w-6 h-6 text-blue-300" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-white mb-2">
              Configuração Rápida
            </h4>
            <p className="text-white/80 text-sm">
              Vamos guiá-lo por 8 passos simples para configurar tudo. 
              Você pode pular etapas e configurar depois se preferir!
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-8">
        <button
          onClick={onNext}
          className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105"
        >
          <span>Começar Configuração</span>
          <Sparkles className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
