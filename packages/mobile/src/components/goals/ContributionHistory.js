import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Calendar, Download, Filter, TrendingUp, DollarSign, History } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Caption, Callout } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import LoadingLogo from '../ui/LoadingLogo';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import { formatBrazilDate } from '../../utils/date';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ContributionHistory({ organizationId }) {
  const [contributions, setContributions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId, selectedGoal, selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar metas
      const { data: goalsData } = await supabase
        .from('financial_goals')
        .select('id, name, goal_type')
        .eq('organization_id', organizationId);

      setGoals(goalsData || []);

      // Buscar contribuições
      let query = supabase
        .from('goal_contributions')
        .select(`
          *,
          financial_goals (
            name,
            goal_type
          )
        `)
        .eq('organization_id', organizationId)
        .order('contribution_date', { ascending: false });

      // Filtro por meta
      if (selectedGoal !== 'all') {
        query = query.eq('goal_id', selectedGoal);
      }

      // Filtro por período
      if (selectedPeriod !== 'all') {
        const now = new Date();
        let startDate;
        
        if (selectedPeriod === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (selectedPeriod === 'quarter') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        } else if (selectedPeriod === 'year') {
          startDate = new Date(now.getFullYear(), 0, 1);
        }
        
        if (startDate) {
          query = query.gte('contribution_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data: contributionsData } = await query;
      setContributions(contributionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Estatísticas
  const totalContributed = contributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const avgContribution = contributions.length > 0 ? totalContributed / contributions.length : 0;
  const largestContribution = contributions.length > 0 
    ? Math.max(...contributions.map(c => parseFloat(c.amount || 0))) 
    : 0;

  const formatDate = (dateString) => formatBrazilDate(dateString);

  const exportToCSV = async () => {
    try {
      const headers = ['Data', 'Meta', 'Valor', 'Observações'];
      const rows = contributions.map(c => [
        formatDate(c.contribution_date),
        c.financial_goals?.name || 'Meta removida',
        c.amount,
        c.notes || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const filename = `contribuicoes_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingLogo />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, styles.statCardBlue]}>
          <View style={styles.statContent}>
            <View style={styles.statLeft}>
              <Caption style={styles.statLabel}>Total Contribuído</Caption>
              <Title2 style={styles.statValue}>{formatCurrency(totalContributed)}</Title2>
            </View>
            <DollarSign size={32} color={colors.brand.primary} />
          </View>
        </Card>

        <Card style={[styles.statCard, styles.statCardGreen]}>
          <View style={styles.statContent}>
            <View style={styles.statLeft}>
              <Caption style={styles.statLabel}>Média por Aporte</Caption>
              <Title2 style={styles.statValue}>{formatCurrency(avgContribution)}</Title2>
            </View>
            <TrendingUp size={32} color={colors.success.main} />
          </View>
        </Card>

        <Card style={[styles.statCard, styles.statCardPurple]}>
          <View style={styles.statContent}>
            <View style={styles.statLeft}>
              <Caption style={styles.statLabel}>Maior Aporte</Caption>
              <Title2 style={styles.statValue}>{formatCurrency(largestContribution)}</Title2>
            </View>
            <History size={32} color={colors.warning.main} />
          </View>
        </Card>
      </View>

      {/* Filtros */}
      <Card style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <View style={styles.filterHeaderLeft}>
            <Filter size={20} color={colors.text.primary} />
            <Title2 style={styles.filterTitle}>Filtros</Title2>
          </View>
          <Button
            title={showFilters ? 'Ocultar' : 'Mostrar'}
            variant="outline"
            size="sm"
            onPress={() => setShowFilters(!showFilters)}
          />
        </View>
        
        {showFilters && (
          <View style={styles.filtersContent}>
            {/* Filtro por Meta */}
            <View style={styles.filterRow}>
              <Caption style={styles.filterLabel}>Meta</Caption>
              <View style={styles.pickerContainer}>
                {/* TODO: Implementar Picker nativo */}
                <Text style={styles.pickerText}>
                  {selectedGoal === 'all' ? 'Todas as metas' : goals.find(g => g.id === selectedGoal)?.name}
                </Text>
              </View>
            </View>

            {/* Filtro por Período */}
            <View style={styles.filterRow}>
              <Caption style={styles.filterLabel}>Período</Caption>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerText}>
                  {selectedPeriod === 'all' ? 'Todo o período' : 
                   selectedPeriod === 'month' ? 'Este mês' :
                   selectedPeriod === 'quarter' ? 'Últimos 3 meses' : 'Este ano'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Lista de Contribuições */}
      {contributions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nenhuma contribuição encontrada"
          description="Adicione contribuições às suas metas para visualizar o histórico aqui."
        />
      ) : (
        <Card style={styles.listCard}>
          <View style={styles.listHeader}>
            <Title2 style={styles.listTitle}>
              Histórico de Contribuições ({contributions.length})
            </Title2>
            <Button
              title="Exportar"
              variant="outline"
              size="sm"
              icon={<Download size={16} color={colors.brand.primary} />}
              iconPosition="left"
              onPress={exportToCSV}
            />
          </View>
          <View style={styles.listContent}>
            {contributions.map((contribution) => (
              <View key={contribution.id} style={styles.contributionItem}>
                <View style={styles.contributionLeft}>
                  <View style={styles.iconContainer}>
                    <Calendar size={20} color={colors.text.secondary} />
                  </View>
                  <View style={styles.contributionInfo}>
                    <Callout weight="semiBold" style={styles.contributionGoal}>
                      {contribution.financial_goals?.name || 'Meta removida'}
                    </Callout>
                    <Caption style={styles.contributionDate}>
                      {formatDate(contribution.contribution_date)}
                    </Caption>
                    {contribution.notes && (
                      <Caption style={styles.contributionNotes}>
                        {contribution.notes}
                      </Caption>
                    )}
                  </View>
                </View>
                <View style={styles.contributionRight}>
                  <Callout weight="bold" style={styles.contributionAmount}>
                    + {formatCurrency(contribution.amount)}
                  </Callout>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    marginBottom: spacing[2],
  },
  statCardBlue: {
    backgroundColor: colors.brand.bg,
  },
  statCardGreen: {
    backgroundColor: colors.success.bg,
  },
  statCardPurple: {
    backgroundColor: colors.warning.bg,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
  },
  statLeft: {
    flex: 1,
  },
  statLabel: {
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterCard: {
    marginHorizontal: spacing[3],
    marginBottom: spacing[3],
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    paddingBottom: spacing[2],
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  filterTitle: {
    fontSize: 18,
  },
  filtersContent: {
    padding: spacing[3],
    paddingTop: 0,
    gap: spacing[3],
  },
  filterRow: {
    gap: spacing[1],
  },
  filterLabel: {
    fontWeight: '500',
    color: colors.text.primary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    padding: spacing[2],
    backgroundColor: colors.background.primary,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  listCard: {
    marginHorizontal: spacing[3],
    marginBottom: spacing[3],
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listTitle: {
    fontSize: 18,
  },
  listContent: {
    padding: spacing[2],
    gap: spacing[2],
  },
  contributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
  },
  contributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
  },
  iconContainer: {
    padding: spacing[2],
    backgroundColor: colors.background.primary,
    borderRadius: radius.md,
  },
  contributionInfo: {
    flex: 1,
  },
  contributionGoal: {
    marginBottom: spacing[0.5],
  },
  contributionDate: {
    color: colors.text.secondary,
  },
  contributionNotes: {
    marginTop: spacing[0.5],
    color: colors.text.tertiary,
  },
  contributionRight: {
    alignItems: 'flex-end',
  },
  contributionAmount: {
    color: colors.success.main,
    fontSize: 18,
  },
});

