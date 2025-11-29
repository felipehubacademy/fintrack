import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline } from '../ui/Text';
import { formatCurrency } from '@fintrack/shared/utils';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

/**
 * DetailedStatsSheet - Bottom Sheet DETALHADO para stats
 * Mostra:
 * - À vista vs Crédito (apenas para despesas)
 * - Responsável (individual + compartilhado)
 */
export function DetailedStatsSheet({ 
  visible, 
  onClose, 
  title, 
  type = 'expense', // 'expense' ou 'income'
  paymentBreakdown = null, // { cash: 0, credit: 0 }
  responsibleData = [], // [{ label, value, color, percentage, individual, shared }]
  totalAmount = 0,
}) {
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={[styles.sheet, { marginBottom: safeBottom }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="semiBold">{title}</Title2>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              accessibilityHint="Fechar detalhes"
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={[styles.content, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }]}
            showsVerticalScrollIndicator={false}
            {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
            scrollEnabled={true}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Payment Breakdown (só para despesas) */}
            {type === 'expense' && paymentBreakdown && (
              <View style={styles.section}>
                <Subheadline weight="semiBold" style={styles.sectionTitle}>
                  Formas de Pagamento
                </Subheadline>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: colors.success.main }]} />
                    <Text variant="callout" style={styles.label}>À Vista</Text>
                    <View style={styles.spacer} />
                    <Callout weight="semiBold">
                      {formatCurrency(paymentBreakdown.cash)}
                    </Callout>
                    <Caption color="secondary" style={{ marginLeft: spacing[1] }}>
                      {totalAmount > 0 ? ((paymentBreakdown.cash / totalAmount) * 100).toFixed(1) : 0}%
                    </Caption>
                  </View>
                  
                  <View style={[styles.row, styles.rowDivider]}>
                    <View style={[styles.dot, { backgroundColor: colors.warning.main }]} />
                    <Text variant="callout" style={styles.label}>Crédito</Text>
                    <View style={styles.spacer} />
                    <Callout weight="semiBold">
                      {formatCurrency(paymentBreakdown.credit)}
                    </Callout>
                    <Caption color="secondary" style={{ marginLeft: spacing[1] }}>
                      {totalAmount > 0 ? ((paymentBreakdown.credit / totalAmount) * 100).toFixed(1) : 0}%
                    </Caption>
                  </View>
                </View>
              </View>
            )}

            {/* Responsible Breakdown */}
            {responsibleData.length > 0 && (
              <View style={styles.section}>
                <Subheadline weight="semiBold" style={styles.sectionTitle}>
                  Por Responsável
                </Subheadline>
                <View style={styles.card}>
                  {responsibleData.map((item, index) => (
                    <View key={index}>
                      {/* Nome e total */}
                      <View style={[styles.row, index > 0 && styles.rowDivider]}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text variant="callout" weight="medium" style={styles.label}>
                          {item.label}
                        </Text>
                        <View style={styles.spacer} />
                        <Callout weight="bold">
                          {formatCurrency(item.value)}
                        </Callout>
                        <Caption color="secondary" style={{ marginLeft: spacing[1] }}>
                          {item.percentage}%
                        </Caption>
                      </View>
                      
                      {/* Breakdown Individual vs Compartilhado */}
                      {(item.individual > 0 || item.shared > 0) && (
                        <View style={styles.breakdown}>
                          <Caption color="tertiary" style={{ fontSize: 11 }}>
                            {item.individual > 0 && `Individual: ${formatCurrency(item.individual)}`}
                            {item.individual > 0 && item.shared > 0 && ' • '}
                            {item.shared > 0 && `Compartilhada: ${formatCurrency(item.shared)}`}
                          </Caption>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {responsibleData.length === 0 && !paymentBreakdown && (
              <View style={styles.emptyState}>
                <Caption color="secondary" align="center">
                  Nenhum dado disponível
                </Caption>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // OVERLAY ESCURO COM FADE
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: height * 0.75,
    // Remover sombra
    shadowOpacity: 0,
    elevation: 0,
    shadowColor: 'transparent',
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  closeButton: {
    padding: spacing[1],
  },

  content: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    // paddingBottom será aplicado dinamicamente com safe area
  },

  section: {
    marginBottom: spacing[3],
  },

  sectionTitle: {
    marginBottom: spacing[2],
    color: colors.text.primary,
  },

  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
  },

  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing[1],
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    marginRight: spacing[1.5],
  },

  label: {
    flex: 0,
    minWidth: 80,
  },

  spacer: {
    flex: 1,
  },

  breakdown: {
    paddingLeft: spacing[4],
    paddingTop: spacing[1],
    paddingBottom: spacing[1],
  },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[0.5],
  },

  emptyState: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
});

