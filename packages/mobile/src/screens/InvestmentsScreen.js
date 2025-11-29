import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { TrendingUp, TrendingDown, DollarSign, Plus, Edit, Trash2 } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { InvestmentModal } from '../components/financial/InvestmentModal';
import { useOrganization } from '../hooks/useOrganization';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';

const INVESTMENT_TYPES = {
  fixed_income: { label: 'Renda Fixa', color: colors.brand.primary },
  stocks: { label: 'Ações', color: colors.success.main },
  crypto: { label: 'Cripto', color: colors.warning.main },
  real_estate: { label: 'Imóveis', color: colors.info.main },
  funds: { label: 'Fundos', color: colors.brand.secondary },
  other: { label: 'Outros', color: colors.text.secondary },
};

export default function InvestmentsScreen() {
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
    } catch (error) {} finally {
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
        showToast('Investimento atualizado com sucesso!', 'success');
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
        showToast('Investimento criado com sucesso!', 'success');
      }

      await fetchInvestments();
      setShowInvestmentModal(false);
      setEditingInvestment(null);
    } catch (error) {
      showToast('Erro ao salvar investimento: ' + (error.message || 'Erro desconhecido'), 'error');
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
      title: 'Excluir investimento',
      message: `Tem certeza que deseja excluir "${investment.name}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investment.id);

      if (error) throw error;

      await fetchInvestments();
      showToast('Investimento excluído com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir investimento: ' + (error.message || 'Erro desconhecido'), 'error');
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
    return <LoadingLogo fullScreen message="Carregando investimentos..." />;
  }

  const totalReturns = getTotalReturns();
  const totalReturnPercentage = getTotalReturnPercentage();

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Investimentos"
        showLogo={true}
        rightIcon={
          <TouchableOpacity onPress={handleAddInvestment} style={{ padding: spacing[1] }}>
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
                  <Footnote color="secondary">Total Investido</Footnote>
                  <Headline weight="bold" style={{ marginTop: spacing[0.5] }}>
                    {formatCurrency(getTotalInvested())}
                  </Headline>
                </View>
                <View style={[styles.iconBadge, { backgroundColor: colors.brand.bg }]}>
                  <DollarSign size={20} color={colors.brand.primary} />
                </View>
              </View>
            </Card>

            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Footnote color="secondary">Valor Atual</Footnote>
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
                <Footnote color="secondary">Rentabilidade</Footnote>
                <Callout 
                  weight="bold" 
                  style={{ 
                    color: totalReturns >= 0 ? colors.success.main : colors.error.main,
                    marginTop: spacing[0.5],
                  }}
                >
                  {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)} ({totalReturnPercentage >= 0 ? '+' : ''}{totalReturnPercentage.toFixed(2)}%)
                </Callout>
              </View>
            </Card>
          </View>
        )}

        {/* Investments List */}
        {investments.length > 0 ? (
          investments.map((investment) => {
            const typeInfo = INVESTMENT_TYPES[investment.type] || INVESTMENT_TYPES.other;
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
                          <Caption style={{ color: typeInfo.color }}>{typeInfo.label}</Caption>
                        </Badge>
                        {investment.institution && (
                          <Caption color="secondary" numberOfLines={1}>
                            {investment.institution}
                          </Caption>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.investmentAmounts}>
                  <View>
                    <Footnote color="secondary">Investido</Footnote>
                    <Callout weight="medium">
                      {formatCurrency(investment.invested_amount)}
                    </Callout>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Footnote color="secondary">Valor Atual</Footnote>
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
                    <Footnote style={{ color: isPositive ? colors.success.main : colors.error.main }}>
                      {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{formatCurrency(investment.returns)} ({isPositive ? '+' : ''}{investment.returnPercentage.toFixed(2)}%)
                    </Footnote>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => handleEditInvestment(investment)}
                  >
                    <Edit size={16} color={colors.text.secondary} />
                    <Caption style={{ color: colors.text.secondary, marginLeft: spacing[0.5] }}>
                      Editar
                    </Caption>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => handleDeleteInvestment(investment)}
                  >
                    <Trash2 size={16} color={colors.error.main} />
                    <Caption style={{ color: colors.error.main, marginLeft: spacing[0.5] }}>
                      Excluir
                    </Caption>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            emoji="💰"
            title="Nenhum investimento registrado"
            description="Adicione seus investimentos para acompanhar a rentabilidade."
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

