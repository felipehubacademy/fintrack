import { BarChart3, PieChart, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Gráficos em Tempo Real',
    description: 'Visualize seus gastos por categoria, mês e responsável',
    color: 'from-[#207DFF] to-[#8FCBFF]'
  },
  {
    icon: PieChart,
    title: 'Análises Detalhadas',
    description: 'Entenda para onde seu dinheiro está indo',
    color: 'from-[#207DFF] to-[#0D2C66]'
  },
  {
    icon: TrendingUp,
    title: 'Comparações Mensais',
    description: 'Compare gastos mês a mês e identifique padrões',
    color: 'from-[#8FCBFF] to-[#207DFF]'
  },
  {
    icon: Users,
    title: 'Visão por Responsável',
    description: 'Veja quanto cada membro da família gastou',
    color: 'from-[#5FFFA7] to-[#207DFF]'
  },
  {
    icon: Calendar,
    title: 'Filtros Inteligentes',
    description: 'Filtre por período, categoria e muito mais',
    color: 'from-[#0D2C66] to-[#207DFF]'
  },
  {
    icon: Sparkles,
    title: 'Insights do Zul',
    description: 'Receba dicas personalizadas sobre seus gastos',
    color: 'from-[#5FFFA7] to-[#8FCBFF]'
  }
];

export default function DashboardTourStep({ onComplete }) {
  return (
    <div className="max-w-5xl xl:max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-[#207DFF] via-[#8FCBFF] to-[#5FFFA7] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#207DFF]/40 animate-pulse">
          <BarChart3 className="w-10 h-10 xl:w-12 xl:h-12 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-3">
          Seu Dashboard Inteligente
        </h2>
        <p className="text-white/80 text-lg xl:text-xl">
          Tudo que você precisa saber sobre suas finanças em um só lugar
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 xl:p-8 hover:bg-white/15 transition-all group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-14 h-14 xl:w-16 xl:h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
              <feature.icon className="w-7 h-7 xl:w-8 xl:h-8 text-white" />
            </div>
            <h3 className="text-xl xl:text-2xl font-bold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-white/70 text-sm xl:text-base">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Dashboard Preview */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 xl:p-10">
        <h3 className="text-2xl xl:text-3xl font-bold text-white mb-6 text-center">
          Preview do Dashboard
        </h3>
        
        {/* Fake Dashboard */}
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 xl:gap-6">
            <div className="bg-gradient-to-br from-[#207DFF]/20 to-[#0D2C66]/20 border border-[#207DFF]/30 rounded-xl p-4 xl:p-6">
              <p className="text-[#8FCBFF] text-sm xl:text-base mb-1">Total do Mês</p>
              <p className="text-white text-2xl xl:text-3xl font-bold">R$ 3.450</p>
            </div>
            <div className="bg-gradient-to-br from-[#5FFFA7]/20 to-[#207DFF]/20 border border-[#5FFFA7]/30 rounded-xl p-4 xl:p-6">
              <p className="text-[#5FFFA7] text-sm xl:text-base mb-1">Despesas</p>
              <p className="text-white text-2xl xl:text-3xl font-bold">42</p>
            </div>
            <div className="bg-gradient-to-br from-[#8FCBFF]/20 to-[#207DFF]/20 border border-[#8FCBFF]/30 rounded-xl p-4 xl:p-6">
              <p className="text-[#8FCBFF] text-sm xl:text-base mb-1">Categorias</p>
              <p className="text-white text-2xl xl:text-3xl font-bold">8</p>
            </div>
          </div>

          {/* Fake Chart */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-end justify-between h-32 space-x-2">
              {[40, 70, 50, 90, 60, 80, 45].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div 
                    className="bg-gradient-to-t from-[#207DFF] to-[#8FCBFF] rounded-t-lg transition-all hover:from-[#207DFF] hover:to-[#5FFFA7]"
                    style={{ height: `${height}%` }}
                  />
                  <p className="text-white/40 text-xs text-center mt-2">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Items */}
          <div className="space-y-2">
            {[
              { desc: 'Mercado', value: 'R$ 250', cat: 'Alimentação', color: 'red' },
              { desc: 'Uber', value: 'R$ 35', cat: 'Transporte', color: 'blue' },
              { desc: 'Netflix', value: 'R$ 45', cat: 'Lazer', color: 'purple' }
            ].map((item, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full bg-${item.color}-400`} />
                  <div>
                    <p className="text-white font-medium">{item.desc}</p>
                    <p className="text-white/50 text-xs">{item.cat}</p>
                  </div>
                </div>
                <p className="text-white font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-[#207DFF]/20 to-[#8FCBFF]/20 backdrop-blur-xl border border-[#207DFF]/30 rounded-2xl p-6 xl:p-8">
        <div className="flex items-start space-x-4">
          <Sparkles className="w-6 h-6 xl:w-7 xl:h-7 text-[#5FFFA7] flex-shrink-0 mt-1" />
          <div className="text-left">
            <h4 className="font-semibold text-white mb-2 text-base xl:text-lg">
              Atualizações em Tempo Real
            </h4>
            <p className="text-white/80 text-sm xl:text-base">
              Cada vez que você ou sua família registrar uma despesa (via WhatsApp ou dashboard), 
              os gráficos e análises são atualizados instantaneamente! 🚀
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onComplete}
          className="px-10 py-5 xl:px-12 xl:py-6 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] hover:from-[#207DFF] hover:to-[#207DFF] text-white rounded-2xl font-bold text-lg xl:text-xl shadow-2xl shadow-[#207DFF]/40 hover:shadow-[#207DFF]/60 transition-all transform hover:scale-105 flex items-center space-x-3"
        >
          <span>Ver Meu Dashboard Agora</span>
          <Sparkles className="w-6 h-6 xl:w-7 xl:h-7" />
        </button>
      </div>
    </div>
  );
}
