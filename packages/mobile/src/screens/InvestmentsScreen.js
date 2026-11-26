import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { TrendingUp, TrendingDown, DollarSign, Plus, Edit, Trash2, Wallet } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Text, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { InvestmentModal } from '../components/financial/InvestmentModal';
import { useOrganization } from '../hooks/useOrganization';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';
import { useI18n } from '../contexts/I18nContext';
import { investmentTypeInfo, investmentTypeLabel } from '../components/financial/investmentTypes';

export default function InvestmentsScreen() {
  const { colors } = useTheme();
  const { t, formatMoney: formatCurrency, formatPercent } = useI18n();
  const { organization, user, loading: orgLoading } = useOrganization();
  const { confirm } = useConfirmation();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState([]);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchInvestments();
    }
  }, [orgLoading, organization]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calcular rentabilidade
      const investmentsWithReturn = (data || []).map(inv => {
        const returns = inv.current_value - inv.invested_amount;
        const returnPercentage = inv.invested_amount > 0 
          ? (returns / inv.invested_amount) * 100 
          : 0;
        
        return {
          ...inv,
          returns,
          returnPercentage,
        };
      });

      setInvestments(investmentsWithReturn);
    } catch (error) {
      showToast(t('investments.loadError'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvestments();
  };

  const handleSaveInvestment = async (investmentData) => {
    try {
      if (editingInvestment) {
        // Atualizar
        const { error } = await supabase
          .from('investments')
          .update(investmentData)
          .eq('id', editingInvestment.id);

        if (error) throw error;
        showToast(t('investments.updated'), 'success');
      } else {
        // Criar
        const { error } = await supabase
          .from('investments')
          .insert({
            ...investmentData,
            organization_id: organization.id,
            user_id: user.id,
          });

        if (error) throw error;
        showToast(t('investments.created'), 'success');
      }

      await fetchInvestments();
      setShowInvestmentModal(false);
      setEditingInvestment(null);
    } catch (error) {
      showToast(t('investments.saveError'), 'error');
    }
  };

  const handleEditInvestment = (investment) => {
    setEditingInvestment(investment);
    setShowInvestmentModal(true);
  };

  const handleAddInvestment = () => {
    setEditingInvestment(null);
    setShowInvestmentModal(true);
  };

  const handleDeleteInvestment = async (investment) => {
    const confirmed = await confirm({
      title: t('investments.deleteTitle'),
      message: t('investments.deleteMessage', { name: investment.name }),
      type: 'danger',
      confirmText: t('common.delete'),
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investment.id);

      if (error) throw error;

      await fetchInvestments();
      showToast(t('investments.deleted'), 'success');
    } catch (error) {
      showToast(t('investments.deleteError'), 'error');
    }
  };

  const getTotalInvested = () => {
    return investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
  };

  const getTotalCurrentValue = () => {
    return investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
  };

  const getTotalReturns = () => {
    return getTotalCurrentValue() - getTotalInvested();
  };

  const getTotalReturnPercentage = () => {
    const invested = getTotalInvested();
    return invested > 0 ? (getTotalReturns() / invested) * 100 : 0;
  };

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message={t('common.loading')} />;
  }

  const totalReturns = getTotalReturns();
  const totalReturnPercentage = getTotalReturnPercentage();
  const signedMoney = (value) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`;
  const signedPercent = (value) => `${value >= 0 ? '+' : ''}${formatPercent(value / 100, { maximumFractionDigits: 2 })}`;

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title={t('investments.title')}
        showLogo={true}
        rightIcon={
          <TouchableOpacity
            onPress={handleAddInvestment}
            style={{ padding: spacing[1] }}
            accessibilityRole="button"
            accessibilityLabel={t('investments.add')}
          >
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
        {/* Summary Cards */}
        {investments.length > 0 && (
          <View style={styles.summarySection}>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Footnote color="secondary">{t('investments.totalInvested')}</Footnote>
                  <Headline weight="bold" style={{ marginTop: spacing[0.5] }}>
                    {formatCurrency(getTotalInvested())}
                  </Headline>
                </View>
                <View style={[styles.iconBadge, { backgroundColor: colors.info.bg }]}>
                  <DollarSign size={20} color={colors.brand.primary} />
                </View>
              </View>
            </Card>

            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Footnote color="secondary">{t('investments.currentValue')}</Footnote>
                  <Headline weight="bold" style={{ marginTop: spacing[0.5] }}>
                    {formatCurrency(getTotalCurrentValue())}
                  </Headline>
                </View>
                <View style={[styles.iconBadge, { 
                  backgroundColor: totalReturns >= 0 ? colors.success.bg : colors.error.bg 
                }]}>
                  {totalReturns >= 0 ? (
                    <TrendingUp size={20} color={colors.success.main} />
                  ) : (
                    <TrendingDown size={20} color={colors.error.main} />
                  )}
                </View>
              </View>
              <View style={{ marginTop: spacing[1.5] }}>
                <Footnote color="secondary">{t('investments.returns')}</Footnote>
                <Callout 
                  weight="bold" 
                  style={{ 
                    color: totalReturns >= 0 ? colors.success.main : colors.error.main,
                    marginTop: spacing[0.5],
                  }}
                >
                  {signedMoney(totalReturns)} ({signedPercent(totalReturnPercentage)})
                </Callout>
              </View>
            </Card>
          </View>
        )}

        {/* Investments List */}
        {investments.length > 0 ? (
          investments.map((investment) => {
            const typeInfo = investmentTypeInfo(investment.type);
            const typeLabel = investmentTypeLabel(investment.type, t);
            const institution = investment.broker || investment.institution;
            const isPositive = investment.returns >= 0;
            
            return (
              <Card key={investment.id} style={styles.investmentCard}>
                <View style={styles.investmentHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.typeIcon, { backgroundColor: `${typeInfo.color}15` }]}>
                      <DollarSign size={20} color={typeInfo.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing[2] }}>
                      <Callout weight="semiBold" numberOfLines={1}>
                        {investment.name}
                      </Callout>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing[0.5] }}>
                        <Badge style={{ backgroundColor: `${typeInfo.color}20`, marginRight: spacing[1] }}>
                          <Caption style={{ color: typeInfo.color }}>{typeLabel}</Caption>
                        </Badge>
                        {institution ? (
                          <Caption color="secondary" numberOfLines={1}>
                            {institution}
                          </Caption>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.investmentAmounts}>
                  <View>
                    <Footnote color="secondary">{t('investments.invested')}</Footnote>
                    <Callout weight="medium">
                      {formatCurrency(investment.invested_amount)}
                    </Callout>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Footnote color="secondary">{t('investments.currentValue')}</Footnote>
                    <Callout weight="semiBold">
                      {formatCurrency(investment.current_value)}
                    </Callout>
                  </View>
                </View>

                <View style={styles.investmentReturns}>
                  <View style={[
                    styles.returnsBadge,
                    { backgroundColor: isPositive ? colors.success.bg : colors.error.bg }
                  ]}>
                    <Footnote
                      style={{ color: isPositive ? colors.success.main : colors.error.main }}
                      accessibilityLabel={t(isPositive ? 'investments.upA11y' : 'investments.downA11y', { amount: formatCurrency(Math.abs(investment.returns)), percent: formatPercent(Math.abs(investment.returnPercentage) / 100, { maximumFractionDigits: 2 }) })}
                    >
                      {isPositive ? '▲' : '▼'} {signedMoney(investment.returns)} ({signedPercent(investment.returnPercentage)})
                    </Footnote>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => handleEditInvestment(investment)}
                    accessibilityRole="button"
                    accessibilityLabel={t('investments.editA11y', { name: investment.name })}
                  >
                    <Edit size={16} color={colors.text.secondary} />
                    <Caption style={{ color: colors.text.secondary, marginLeft: spacing[0.5] }}>
                      {t('common.edit')}
                    </Caption>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => handleDeleteInvestment(investment)}
                    accessibilityRole="button"
                    accessibilityLabel={t('investments.deleteA11y', { name: investment.name })}
                  >
                    <Trash2 size={16} color={colors.error.main} />
                    <Caption style={{ color: colors.error.main, marginLeft: spacing[0.5] }}>
                      {t('common.delete')}
                    </Caption>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={<Wallet size={48} color="#AEAEB2" />}
            title={t('investments.emptyTitle')}
            description={t('investments.emptyMessage')}
            actionLabel={t('investments.add')}
            onAction={handleAddInvestment}
          />
        )}

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Investment Modal */}
      <InvestmentModal
        visible={showInvestmentModal}
        onClose={() => {
          setShowInvestmentModal(false);
          setEditingInvestment(null);
        }}
        onSave={handleSaveInvestment}
        investment={editingInvestment}
        goals={[]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing[2],
  },

  summarySection: {
    marginBottom: spacing[3],
    gap: spacing[2],
  },

  summaryCard: {
    padding: spacing[3],
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  investmentCard: {
    marginBottom: spacing[2],
  },

  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },

  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  investmentAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },

  investmentReturns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  returnsBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
  },
});

