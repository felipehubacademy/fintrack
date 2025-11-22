import { Award, TrendingUp, Target, Calendar, Zap } from 'lucide-react';

// Sistema de badges profissional e elegante
const BADGE_DEFINITIONS = {
  // Disciplina e Consistência
  first_goal: {
    id: 'first_goal',
    name: 'Planejador',
    description: 'Primeira meta financeira criada',
    icon: Target,
    color: '#3B82F6',
    tier: 'bronze'
  },
  first_contribution: {
    id: 'first_contribution',
    name: 'Comprometido',
    description: 'Primeira contribuição realizada',
    icon: TrendingUp,
    color: '#3B82F6',
    tier: 'bronze'
  },
  streak_3: {
    id: 'streak_3',
    name: 'Consistente',
    description: '3 meses consecutivos contribuindo',
    icon: Calendar,
    color: '#8B5CF6',
    tier: 'silver'
  },
  streak_6: {
    id: 'streak_6',
    name: 'Disciplinado',
    description: '6 meses consecutivos contribuindo',
    icon: Calendar,
    color: '#8B5CF6',
    tier: 'silver'
  },
  streak_12: {
    id: 'streak_12',
    name: 'Inabalável',
    description: '1 ano consecutivo contribuindo',
    icon: Zap,
    color: '#F59E0B',
    tier: 'gold'
  },
  
  // Conquistas de Valor
  saved_10k: {
    id: 'saved_10k',
    name: 'Poupador',
    description: 'Economizou R$ 10.000',
    icon: Award,
    color: '#3B82F6',
    tier: 'bronze'
  },
  saved_50k: {
    id: 'saved_50k',
    name: 'Investidor',
    description: 'Economizou R$ 50.000',
    icon: Award,
    color: '#8B5CF6',
    tier: 'silver'
  },
  saved_100k: {
    id: 'saved_100k',
    name: 'Patrimônio Sólido',
    description: 'Economizou R$ 100.000',
    icon: Award,
    color: '#F59E0B',
    tier: 'gold'
  },
  
  // Metas Atingidas
  goal_completed_1: {
    id: 'goal_completed_1',
    name: 'Realizador',
    description: 'Atingiu sua primeira meta',
    icon: Target,
    color: '#10B981',
    tier: 'bronze'
  },
  goal_completed_3: {
    id: 'goal_completed_3',
    name: 'Determinado',
    description: 'Atingiu 3 metas',
    icon: Target,
    color: '#10B981',
    tier: 'silver'
  },
  goal_completed_10: {
    id: 'goal_completed_10',
    name: 'Mestre Financeiro',
    description: 'Atingiu 10 metas',
    icon: Target,
    color: '#10B981',
    tier: 'gold'
  },
  
  // Velocidade
  goal_early: {
    id: 'goal_early',
    name: 'Acelerado',
    description: 'Atingiu meta antes do prazo',
    icon: Zap,
    color: '#F59E0B',
    tier: 'silver'
  }
};

const TIER_STYLES = {
  bronze: {
    gradient: 'from-[#8B6F47] to-[#C19A6B]', // Bronze sóbrio
    border: 'border-[#8B6F47]',
    glow: 'shadow-[#8B6F47]/15',
    bg: 'bg-amber-50/50',
    ring: 'ring-[#8B6F47]/10'
  },
  silver: {
    gradient: 'from-[#A8A9AD] to-[#D4D5D8]', // Prata elegante
    border: 'border-[#A8A9AD]',
    glow: 'shadow-[#A8A9AD]/15',
    bg: 'bg-gray-50/50',
    ring: 'ring-[#A8A9AD]/10'
  },
  gold: {
    gradient: 'from-[#D4AF37] to-[#F4E5B0]', // Ouro refinado
    border: 'border-[#D4AF37]',
    glow: 'shadow-[#D4AF37]/20',
    bg: 'bg-yellow-50/50',
    ring: 'ring-[#D4AF37]/10'
  }
};

export default function GoalBadges({ badges = [], size = 'md', showLocked = false }) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-9 w-9'
  };

  // Determinar quais badges o usuário possui
  const earnedBadgeIds = badges.map(b => b.badge_id);
  const allBadges = Object.values(BADGE_DEFINITIONS);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
      {allBadges.map((badge) => {
        const isEarned = earnedBadgeIds.includes(badge.id);
        const tierStyle = TIER_STYLES[badge.tier];
        const Icon = badge.icon;

        if (!isEarned && !showLocked) return null;

        return (
          <div
            key={badge.id}
            className="group relative flex flex-col items-center"
          >
            {/* Badge Circle */}
            <div
              className={`
                ${sizeClasses[size]}
                rounded-full
                border-2
                ${isEarned ? tierStyle.border : 'border-gray-300'}
                ${isEarned ? `bg-gradient-to-br ${tierStyle.gradient}` : 'bg-gray-200'}
                ${isEarned ? `shadow-md ${tierStyle.glow}` : 'shadow-sm'}
                flex items-center justify-center
                transition-all duration-200
                ${isEarned ? 'group-hover:scale-105 group-hover:shadow-lg' : 'opacity-30'}
              `}
            >
              <Icon
                className={`${iconSizes[size]} ${isEarned ? 'text-white' : 'text-gray-400'}`}
              />
            </div>

            {/* Badge Name */}
            <span
              className={`
                text-xs text-center mt-2 font-medium
                ${isEarned ? 'text-gray-900' : 'text-gray-400'}
              `}
            >
              {badge.name}
            </span>

            {/* Tooltip on Hover */}
            <div
              className="
                absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                pointer-events-none
                z-10
                w-48
              "
            >
              <div
                className={`
                  ${isEarned ? tierStyle.bg : 'bg-gray-100'}
                  border
                  ${isEarned ? tierStyle.border : 'border-gray-300'}
                  rounded-lg
                  p-3
                  shadow-xl
                `}
              >
                <div className="flex items-start space-x-2">
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${isEarned ? 'text-gray-900' : 'text-gray-400'}`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {badge.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {badge.description}
                    </p>
                    {!isEarned && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Bloqueado
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Export para uso em outros componentes
export { BADGE_DEFINITIONS };

