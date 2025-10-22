import { CheckCircle, Sparkles, TrendingUp, Users, MessageCircle } from 'lucide-react';

export default function CompletionStep({ organization, onComplete }) {
  const achievements = [
    {
      icon: CheckCircle,
      title: 'Configuração Completa',
      description: 'Sua organização está pronta para uso'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp Ativo',
      description: 'Converse com o Zul a qualquer momento'
    },
    {
      icon: Users,
      title: 'Família Conectada',
      description: 'Todos podem registrar despesas'
    },
    {
      icon: TrendingUp,
      title: 'Controle em Tempo Real',
      description: 'Visualize suas finanças agora mesmo'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto text-center space-y-8">
      {/* Success Animation */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-gradient-to-br from-green-500/30 to-blue-500/30 rounded-full animate-pulse" />
        </div>
        <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 transform animate-[bounce_1s_ease-in-out]">
          <CheckCircle className="w-16 h-16 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-4">
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          Tudo Pronto! 🎉
        </h2>
        <p className="text-xl text-white/80 max-w-2xl mx-auto">
          O <span className="font-semibold text-blue-300">{organization?.name}</span> está configurado e pronto para usar
        </p>
      </div>

      {/* Achievements Grid */}
      <div className="grid md:grid-cols-2 gap-4 pt-8">
        {achievements.map((achievement, index) => (
          <div 
            key={index}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-left transform transition-all duration-300 hover:bg-white/15 hover:scale-105"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <achievement.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {achievement.title}
            </h3>
            <p className="text-white/70 text-sm">
              {achievement.description}
            </p>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-blue-400/30 rounded-2xl p-8 mt-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Sparkles className="w-8 h-8 text-blue-300" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-bold text-white text-xl mb-3">
              Próximos Passos
            </h4>
            <ul className="space-y-3 text-white/80">
              <li className="flex items-start space-x-3">
                <span className="text-blue-300 font-bold">1.</span>
                <span>Experimente registrar uma despesa conversando com o Zul no WhatsApp</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-blue-300 font-bold">2.</span>
                <span>Explore o dashboard e veja os gráficos em tempo real</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-blue-300 font-bold">3.</span>
                <span>Convide sua família para começarem juntos</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-8">
        <button
          onClick={onComplete}
          className="inline-flex items-center space-x-3 px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105"
        >
          <span>Ir para o Dashboard</span>
          <Sparkles className="w-6 h-6" />
        </button>
      </div>

      {/* Fun fact */}
      <p className="text-white/50 text-sm pt-4">
        💡 Dica: Você pode personalizar tudo nas configurações depois
      </p>
    </div>
  );
}
