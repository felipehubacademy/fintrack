import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, TrendingUp, Plus, Edit, Trash2, Trophy, Crosshair } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Text, Title1, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ProgressRing } from '../components/ui/ProgressRing';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { GoalModal } from '../components/financial/GoalModal';
import { useOrganization } from '../hooks/useOrganization';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';
import { useI18n } from '../contexts/I18nContext';

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { t, formatMoney, formatDate } = useI18n();
  const { organization, user, loading: orgLoading } = useOrganization();
  const { confirm } = useConfirmation();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchGoals();
    }
  }, [orgLoading, organization]);

  const fetchGoals = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('organization_id', organization.id)
        .order('target_date', { ascending: true });

      if (error) throw error;

      // Progress per goal
      const goalsWithProgress = (data || []).map(goal => {
        const progress = goal.target_amount > 0 
          ? (goal.current_amount / goal.target_amount) * 100 
          : 0;
        
        return {
          ...goal,
          progress,
          remaining: goal.target_amount - goal.current_amount,
        };
      });

      setGoals(goalsWithProgress);
    } catch (error) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGoals();
  };

  const handleSaveGoal = async (goalData) => {
    try {
      if (editingGoal) {
        // Update
        const { error } = await supabase
          .from('financial_goals')
          .update({
            name: goalData.name,
            goal_type: goalData.goal_type,
            target_amount: goalData.target_amount,
            current_amount: goalData.current_amount,
            monthly_contribution: goalData.monthly_contribution,
            target_date: goalData.target_date,
            description: goalData.description,
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
        showToast(t('goals.updated'), 'success');
      } else {
        // Create
        const { error } = await supabase
          .from('financial_goals')
          .insert({
            ...goalData,
            organization_id: organization.id,
            user_id: user.id,
          });

        if (error) throw error;
        showToast(t('goals.created'), 'success');
      }

      await fetchGoals();
      setShowGoalModal(false);
      setEditingGoal(null);
    } catch (error) {
      showToast(t('goals.saveError'), 'error');
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async (goal) => {
    const confirmed = await confirm({
      title: t('goals.delete.title'),
      message: t('goals.delete.message', { name: goal.name }),
      confirmText: t('common.delete'),
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', goal.id);

      if (error) throw error;

      await fetchGoals();
      showToast(t('goals.delete.done'), 'success');
    } catch (error) {
      showToast(t('goals.delete.error'), 'error');
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return colors.success.main;
    if (progress >= 75) return colors.brand.primary;
    if (progress >= 50) return colors.info.main;
    if (progress >= 25) return colors.warning.main;
    return colors.error.main;
  };

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message={t('goals.loading')} />;
  }

  const reachedCount = goals.filter(g => g.progress >= 100).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScreenHeader
        user={user}
        title={t('goals.title')}
        showLogo={true}
        rightIcon={
          <TouchableOpacity onPress={handleAddGoal} style={{ padding: spacing[1] }} accessibilityRole="button" accessibilityLabel={t('goals.add')}>
            <Plus size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Summary */}
        {goals.length > 0 && (
          <LinearGradient
            colors={colors.isDark
              ? [colors.brand.primaryDark || '#0047CC', colors.background.tertiary || '#171717']
              : colors.brand.gradient || ['#1A6AFF', '#0047CC']
            }
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Caption style={{ color: 'rgba(255,255,255,0.8)' }}>{t('goals.overall')}</Caption>
                <Title1 tabular style={{ color: '#FFFFFF', marginTop: spacing[0.5] }}>
                  {reachedCount}/{goals.length}
                </Title1>
                <Footnote style={{ color: 'rgba(255,255,255,0.8)', marginTop: spacing[0.5] }}>
                  {t('goals.reachedLabel', { count: reachedCount })}
                </Footnote>
              </View>
              <ProgressRing
                progress={goals.length > 0 ? reachedCount / goals.length : 0}
                size={72}
                strokeWidth={7}
                color="#F5A623"
                trackColor="rgba(255,255,255,0.2)"
                showPercentage
              />
            </View>
          </LinearGradient>
        )}

        {goals.length > 0 ? (
          goals.map((goal) => {
            const progressColor = getProgressColor(goal.progress);

            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <ProgressRing
                      progress={Math.min(goal.progress, 100) / 100}
                      size={52}
                      strokeWidth={5}
                      color={progressColor}
                      showPercentage
                    />
                    <View style={{ flex: 1, marginLeft: spacing[2] }}>
                      <Callout weight="semiBold" numberOfLines={1}>
                        {goal.name}
                      </Callout>
                      {goal.description && (
                        <Caption color="secondary" numberOfLines={1}>
                          {goal.description}
                        </Caption>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.goalAmounts}>
                  <View>
                    <Footnote color="secondary">{t('goals.saved')}</Footnote>
                    <Callout weight="bold" tabular style={{ color: progressColor }}>
                      {formatMoney(goal.current_amount)}
                    </Callout>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Footnote color="secondary">{t('goals.target')}</Footnote>
                    <Callout weight="semiBold" tabular>
                      {formatMoney(goal.target_amount)}
                    </Callout>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: colors.background.tertiary || colors.border.light }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(goal.progress, 100)}%`,
                          backgroundColor: progressColor,
                        },
                      ]}
                    />
                  </View>
                  <Footnote tabular style={{ color: progressColor, marginLeft: spacing[1] }}>
                    {goal.progress.toFixed(0)}%
                  </Footnote>
                </View>

                <View style={styles.goalFooter}>
                  <View style={{ flex: 1 }}>
                    <Footnote color="secondary">
                      {goal.remaining > 0
                        ? t('goals.toGo', { amount: formatMoney(goal.remaining) })
                        : goal.remaining === 0
                        ? t('goals.reached')
                        : t('goals.over', { amount: formatMoney(Math.abs(goal.remaining)) })
                      }
                    </Footnote>
                    {goal.target_date && (
                      <Footnote color="secondary" style={{ marginTop: spacing[0.5] }}>
                        {t('goals.deadline', { date: formatDate(goal.target_date, 'medium') })}
                      </Footnote>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <TouchableOpacity
                      onPress={() => handleEditGoal(goal)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('goals.edit')}: ${goal.name}`}
                    >
                      <Edit size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteGoal(goal)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('goals.remove')}: ${goal.name}`}
                    >
                      <Trash2 size={16} color={colors.error.main} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={<Crosshair size={48} color={colors.text.tertiary} />}
            title={t('goals.empty.title')}
            description={t('goals.empty.body', { example: t('goals.empty.example') })}
            zulText={t('goals.empty.example')}
            actionLabel={t('goals.empty.create')}
            onAction={handleAddGoal}
          />
        )}

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Goal Modal */}
      <GoalModal
        visible={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing[2],
  },

  heroCard: {
    marginHorizontal: spacing[2],
    marginBottom: spacing[3],
    borderRadius: 12,
    padding: spacing[3],
    overflow: 'hidden',
  },

  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  goalCard: {
    marginBottom: spacing[2],
  },

  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },

  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },

  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  goalFooter: {
    marginTop: spacing[1],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

