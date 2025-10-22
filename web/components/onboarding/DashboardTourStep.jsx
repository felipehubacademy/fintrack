import { BarChart3, PieChart, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Gráficos em Tempo Real',
    description: 'Visualize seus gastos por categoria, mês e responsável',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: PieChart,
    title: 'Análises Detalhadas',
    description: 'Entenda para onde seu dinheiro está indo',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: TrendingUp,
    title: 'Comparações Mensais',
    description: 'Compare gastos mês a mês e identifique padrões',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: Users,
    title: 'Visão por Responsável',
    description: 'Veja quanto cada membro da família gastou',
    color: 'from-green-500 to-teal-500'
  },
  {
    icon: Calendar,
    title: 'Filtros Inteligentes',
    description: 'Filtre por período, categoria e muito mais',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    icon: Sparkles,
    title: 'Insights do Zul',
    description: 'Receba dicas personalizadas sobre seus gastos',
    color: 'from-yellow-500 to-orange-500'
  }
];

export default function DashboardTourStep({ onComplete }) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
          <BarChart3 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Seu Dashboard Inteligente
        </h2>
        <p className="text-white/80 text-lg">
          Tudo que você precisa saber sobre suas finanças em um só lugar
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-white/70">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Dashboard Preview */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          Preview do Dashboard
        </h3>
        
        {/* Fake Dashboard */}
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm mb-1">Total do Mês</p>
              <p className="text-white text-2xl font-bold">R$ 3.450</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-400/30 rounded-xl p-4">
              <p className="text-green-300 text-sm mb-1">Despesas</p>
              <p className="text-white text-2xl font-bold">42</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/30 rounded-xl p-4">
              <p className="text-purple-300 text-sm mb-1">Categorias</p>
              <p className="text-white text-2xl font-bold">8</p>
            </div>
          </div>

          {/* Fake Chart */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-end justify-between h-32 space-x-2">
              {[40, 70, 50, 90, 60, 80, 45].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div 
                    className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg transition-all hover:from-blue-400 hover:to-purple-400"
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
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <Sparkles className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-1" />
          <div className="text-left">
            <h4 className="font-semibold text-white mb-2">
              Atualizações em Tempo Real
            </h4>
            <p className="text-white/80 text-sm">
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
          className="px-10 py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105 flex items-center space-x-3"
        >
          <span>Ver Meu Dashboard Agora</span>
          <Sparkles className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
