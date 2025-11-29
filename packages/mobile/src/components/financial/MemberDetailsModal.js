import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency } from '@fintrack/shared/utils';

const { width, height } = Dimensions.get('window');

export default function MemberDetailsModal({ isOpen, onClose, member, transactions }) {
  if (!isOpen || !member) return null;

  const { allocations = [], cashExpenses = [], creditExpenses = [] } = transactions || {};

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPaymentMethod = (expense) => {
    if (expense.payment_method === 'cash') return 'À Vista';
    if (expense.payment_method === 'credit' && expense.card_name) {
      return `Crédito - ${expense.card_name}`;
    }
    return 'Não especificado';
  };

  // Agrupar transações por forma de pagamento
  const groupByPaymentMethod = (expenses) => {
    const groups = {};
    expenses.forEach(expense => {
      const method = getPaymentMethod(expense);
      if (!groups[method]) {
        groups[method] = [];
      }
      groups[method].push(expense);
    });
    return groups;
  };

  const individualOut = Number(member.cash?.individual || 0) + Number(member.credit?.individual || 0);
  const sharedOut = Number(member.cash?.shared || 0) + Number(member.credit?.shared || 0);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Title2 weight="bold">{member.name}</Title2>
              <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                Detalhamento de transações do mês
              </Caption>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled={true}
          >
            {/* Resumo */}
            <View style={styles.summaryGrid}>
              <Card style={[styles.summaryCard, { backgroundColor: colors.brand.bg }]}>
                <Caption color="secondary" style={{ marginBottom: spacing[1] }} numberOfLines={1}>
                  Aportes
                </Caption>
                <Headline weight="bold" style={{ color: colors.brand.primary }} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(member.totals?.allocations || 0)}
                </Headline>
              </Card>
              <Card style={styles.summaryCard}>
                <Caption color="secondary" style={{ marginBottom: spacing[1] }} numberOfLines={1}>
                  Saídas Individuais
                </Caption>
                <Headline weight="bold" numberOfLines={1} adjustsFontSizeToFit>
                  -{formatCurrency(individualOut)}
                </Headline>
              </Card>
              <Card style={styles.summaryCard}>
                <Caption color="secondary" style={{ marginBottom: spacing[1] }} numberOfLines={1}>
                  Saídas Compartilhadas
                </Caption>
                <Headline weight="bold" numberOfLines={1} adjustsFontSizeToFit>
                  -{formatCurrency(sharedOut)}
                </Headline>
              </Card>
              <Card style={[
                styles.summaryCard,
                { backgroundColor: member.totals?.balance >= 0 ? colors.success.bg : colors.error.bg }
              ]}>
                <Caption color="secondary" style={{ marginBottom: spacing[1] }} numberOfLines={1}>
                  Saldo
                </Caption>
                <Headline weight="bold" style={{
                  color: member.totals?.balance >= 0 ? colors.success.main : colors.error.main
                }} numberOfLines={1} adjustsFontSizeToFit>
                  {member.totals?.balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(member.totals?.balance || 0))}
                </Headline>
              </Card>
            </View>

            {/* Aportes */}
            {allocations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.brand.primary }]} />
                  <Subheadline weight="semiBold">
                    Aportes ({allocations.length})
                  </Subheadline>
                </View>
                <Card>
                  {allocations.map((allocation, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.transactionRow,
                        idx < allocations.length - 1 && styles.transactionRowBorder
                      ]}
                    >
                      <View style={styles.transactionLeft}>
                        <Callout weight="medium" numberOfLines={1}>{formatDate(allocation.date)}</Callout>
                        <Caption color="secondary" numberOfLines={1} style={{ marginTop: spacing[0.5] }}>
                          {allocation.bank_account_name || '-'}
                        </Caption>
                      </View>
                      <View style={styles.transactionRight}>
                        <Caption color="secondary" style={{ marginBottom: spacing[0.5] }} numberOfLines={1}>
                          {allocation.allocation_target === 'individual' ? 'Individual' : 'Compartilhado'}
                        </Caption>
                        <Callout weight="bold" style={{ color: colors.brand.primary }} numberOfLines={1} adjustsFontSizeToFit>
                          {formatCurrency(allocation.amount)}
                        </Callout>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* Saídas Individuais */}
            {(cashExpenses.filter(e => e.isIndividual).length > 0 || creditExpenses.filter(e => e.isIndividual).length > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.text.secondary }]} />
                  <Subheadline weight="semiBold">
                    Saídas Individuais ({cashExpenses.filter(e => e.isIndividual).length + creditExpenses.filter(e => e.isIndividual).length})
                  </Subheadline>
                </View>
                {(() => {
                  const individualExpenses = [...cashExpenses, ...creditExpenses]
                    .filter(e => e.isIndividual)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                  const groupedExpenses = groupByPaymentMethod(individualExpenses);
                  
                  return Object.entries(groupedExpenses).map(([paymentMethod, expenses]) => (
                    <View key={paymentMethod} style={styles.paymentGroup}>
                      <Caption weight="semiBold" style={{ marginBottom: spacing[1], paddingHorizontal: spacing[2] }}>
                        {paymentMethod} ({expenses.length})
                      </Caption>
                      <Card>
                        {expenses.map((expense, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.transactionRow,
                              idx < expenses.length - 1 && styles.transactionRowBorder
                            ]}
                          >
                            <View style={styles.transactionLeft}>
                              <Callout weight="medium" numberOfLines={1}>{formatDate(expense.date)}</Callout>
                              <Caption color="secondary" numberOfLines={2} style={{ marginTop: spacing[0.5] }}>
                                {expense.description || '-'}
                              </Caption>
                            </View>
                            <View style={styles.transactionRight}>
                              <Callout weight="bold" numberOfLines={1}>
                                -{formatCurrency(expense.amount)}
                              </Callout>
                            </View>
                          </View>
                        ))}
                        <View style={[styles.transactionRow, styles.subtotalRow]}>
                          <View style={styles.transactionLeft}>
                            <Callout weight="semiBold" numberOfLines={1}>
                              Subtotal
                            </Callout>
                          </View>
                          <Callout weight="bold" numberOfLines={1}>
                            -{formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
                          </Callout>
                        </View>
                      </Card>
                    </View>
                  ));
                })()}
              </View>
            )}

            {/* Saídas Compartilhadas */}
            {(cashExpenses.filter(e => e.isShared).length > 0 || creditExpenses.filter(e => e.isShared).length > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: colors.text.secondary }]} />
                  <Subheadline weight="semiBold">
                    Saídas Compartilhadas ({cashExpenses.filter(e => e.isShared).length + creditExpenses.filter(e => e.isShared).length})
                  </Subheadline>
                </View>
                {(() => {
                  const sharedExpenses = [...cashExpenses, ...creditExpenses]
                    .filter(e => e.isShared)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                  const groupedExpenses = groupByPaymentMethod(sharedExpenses);
                  
                  return Object.entries(groupedExpenses).map(([paymentMethod, expenses]) => (
                    <View key={paymentMethod} style={styles.paymentGroup}>
                      <Caption weight="semiBold" style={{ marginBottom: spacing[1], paddingHorizontal: spacing[2] }}>
                        {paymentMethod} ({expenses.length})
                      </Caption>
                      <Card>
                        {expenses.map((expense, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.transactionRow,
                              idx < expenses.length - 1 && styles.transactionRowBorder
                            ]}
                          >
                            <View style={styles.transactionLeft}>
                              <Callout weight="medium" numberOfLines={1}>{formatDate(expense.date)}</Callout>
                              <Caption color="secondary" numberOfLines={2} style={{ marginTop: spacing[0.5] }}>
                                {expense.description || '-'}
                              </Caption>
                            </View>
                            <View style={styles.transactionRight}>
                              <Caption color="secondary" style={{ marginBottom: spacing[0.5] }} numberOfLines={1}>
                                Total: -{formatCurrency(expense.totalAmount || expense.amount)}
                              </Caption>
                              <Callout weight="bold" numberOfLines={1} adjustsFontSizeToFit>
                                Sua parte: -{formatCurrency(expense.memberShare || expense.amount)}
                              </Callout>
                            </View>
                          </View>
                        ))}
                        <View style={[styles.transactionRow, styles.subtotalRow]}>
                          <View style={styles.transactionLeft}>
                            <Callout weight="semiBold" numberOfLines={1}>
                              Subtotal
                            </Callout>
                          </View>
                          <View style={styles.transactionRight}>
                            <Caption color="secondary" style={{ marginBottom: spacing[0.5] }} numberOfLines={1}>
                              Total: -{formatCurrency(expenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0))}
                            </Caption>
                            <Callout weight="bold" numberOfLines={1}>
                              Sua parte: -{formatCurrency(expenses.reduce((sum, e) => sum + Number(e.memberShare || e.amount || 0), 0))}
                            </Callout>
                          </View>
                        </View>
                      </Card>
                    </View>
                  ));
                })()}
              </View>
            )}

            {/* Mensagem se não houver transações */}
            {allocations.length === 0 && 
             cashExpenses.length === 0 && 
             creditExpenses.length === 0 && (
              <View style={styles.emptyState}>
                <Caption color="secondary">Nenhuma transação registrada neste mês.</Caption>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Fechar"
              variant="outline"
              onPress={onClose}
              style={styles.footerButton}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: height * 0.96,
    minHeight: height * 0.75,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing[1.5],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[3],
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - spacing[3] * 2 - spacing[2]) / 2,
    padding: spacing[2.5],
    minHeight: 80,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    gap: spacing[1.5],
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  paymentGroup: {
    marginBottom: spacing[3],
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    minHeight: 50,
    width: '100%',
  },
  transactionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionLeft: {
    flex: 1,
    marginRight: spacing[2],
    minWidth: 0, // Permite que o flex funcione corretamente
  },
  transactionRight: {
    alignItems: 'flex-end',
    minWidth: 100,
    flexShrink: 0,
  },
  subtotalRow: {
    backgroundColor: colors.background.secondary,
    marginTop: spacing[1],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  emptyState: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  footer: {
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    width: '100%',
  },
});

