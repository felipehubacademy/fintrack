import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Award, TrendingUp, Target, Calendar, Zap, X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Caption, Title2 } from '../ui/Text';
import { Card } from '../ui/Card';
import BadgeAchievementModal from './BadgeAchievementModal';

// Sistema de badges profissional e elegante
export const BADGE_DEFINITIONS = {
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
    gradient: ['#8B6F47', '#C19A6B'],
    border: '#8B6F47',
    bg: '#FFF8E1',
  },
  silver: {
    gradient: ['#A8A9AD', '#D4D5D8'],
    border: '#A8A9AD',
    bg: '#F5F5F5',
  },
  gold: {
    gradient: ['#D4AF37', '#F4E5B0'],
    border: '#D4AF37',
    bg: '#FFFDE7',
  }
};

const SIZE_STYLES = {
  sm: {
    container: 48,
    icon: 20,
  },
  md: {
    container: 64,
    icon: 28,
  },
  lg: {
    container: 80,
    icon: 36,
  },
};

export default function GoalBadges({ badges = [], size = 'md', showLocked = false, onBadgeEarned }) {
  const sizeStyle = SIZE_STYLES[size];
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [newBadgeId, setNewBadgeId] = useState(null);
  const [previousBadgeIds, setPreviousBadgeIds] = useState([]);
  
  // Determinar quais badges o usuário possui
  const earnedBadgeIds = badges.map(b => b.badge_id);
  const allBadges = Object.values(BADGE_DEFINITIONS);

  // Detectar novos badges conquistados
  useEffect(() => {
    if (previousBadgeIds.length > 0 && earnedBadgeIds.length > previousBadgeIds.length) {
      // Encontrar o novo badge
      const newBadge = earnedBadgeIds.find(id => !previousBadgeIds.includes(id));
      if (newBadge) {
        setNewBadgeId(newBadge);
        if (onBadgeEarned) {
          onBadgeEarned(newBadge);
        }
      }
    }
    setPreviousBadgeIds(earnedBadgeIds);
  }, [earnedBadgeIds]);

  return (
    <>
      <View style={styles.container}>
        {allBadges.map((badge) => {
          const isEarned = earnedBadgeIds.includes(badge.id);
          const tierStyle = TIER_STYLES[badge.tier];
          const Icon = badge.icon;

          if (!isEarned && !showLocked) return null;

          return (
            <TouchableOpacity
              key={badge.id}
              onPress={() => setSelectedBadge(badge)}
              style={styles.badgeContainer}
            >
              {/* Badge Circle */}
              <View
                style={[
                  styles.badgeCircle,
                  {
                    width: sizeStyle.container,
                    height: sizeStyle.container,
                    borderRadius: sizeStyle.container / 2,
                    borderColor: isEarned ? tierStyle.border : colors.border.light,
                    backgroundColor: isEarned ? tierStyle.gradient[0] : colors.background.secondary,
                    opacity: isEarned ? 1 : 0.3,
                  },
                  isEarned && shadows.md,
                ]}
              >
                <Icon
                  size={sizeStyle.icon}
                  color={isEarned ? colors.neutral[0] : colors.text.tertiary}
                />
              </View>

              {/* Badge Name */}
              <Caption
                style={[
                  styles.badgeName,
                  {
                    color: isEarned ? colors.text.primary : colors.text.tertiary,
                  },
                ]}
              >
                {badge.name}
              </Caption>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <Modal
          visible={!!selectedBadge}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBadge(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={() => setSelectedBadge(null)}
            />
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  {React.createElement(selectedBadge.icon, {
                    size: 24,
                    color: colors.brand.primary,
                  })}
                  <Title2 style={styles.modalTitle}>{selectedBadge.name}</Title2>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedBadge(null)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDescription}>{selectedBadge.description}</Text>
              {!earnedBadgeIds.includes(selectedBadge.id) && (
                <Text style={styles.modalLocked}>Bloqueado</Text>
              )}
            </Card>
          </View>
        </Modal>
      )}

      {/* Badge Achievement Modal */}
      <BadgeAchievementModal
        visible={!!newBadgeId}
        badgeId={newBadgeId}
        onClose={() => setNewBadgeId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: spacing[3],
  },
  badgeContainer: {
    alignItems: 'center',
    width: 80,
  },
  badgeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeName: {
    marginTop: spacing[1],
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  modalTitle: {
    flex: 1,
  },
  modalCloseButton: {
    padding: spacing[1],
  },
  modalDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing[2],
  },
  modalLocked: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
});

