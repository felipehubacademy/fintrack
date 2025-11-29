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
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { BankIcon } from './BankIcon';
import { formatCurrency } from '@fintrack/shared/utils';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

/**
 * BankAccountsSheet - Bottom Sheet para listar contas bancárias com saldos
 */
export function BankAccountsSheet({ visible, onClose, accounts = [] }) {
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
        <View style={[styles.sheet, { marginBottom: safeBottom }]}>
          {/* Handle (barra superior) */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="semiBold">Contas Bancárias</Title2>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              accessibilityHint="Fechar lista de contas"
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
            scrollEnabled={true}
          >
            {accounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Caption color="secondary">Nenhuma conta cadastrada</Caption>
              </View>
            ) : (
              <View style={styles.list}>
                {accounts.map((account, index) => {
                  const balance = Number(account.current_balance || account.balance || 0);
                  const isPositive = balance >= 0;
                  
                  return (
                    <View key={account.id || index} style={styles.accountItem}>
                      <View style={styles.accountLeft}>
                        <View style={styles.bankIconContainer}>
                          <BankIcon
                            bankName={account.bank || account.institution_name || 'Banco'}
                            size={32}
                          />
                        </View>
                        <View style={styles.accountInfo}>
                          <Callout weight="medium">{account.name || 'Conta'}</Callout>
                          <Caption color="secondary" style={styles.accountBank}>
                            {account.bank || account.institution_name || 'Banco'}
                          </Caption>
                        </View>
                      </View>
                      <View style={styles.accountRight}>
                        <Callout 
                          weight="semiBold"
                          style={{ color: isPositive ? colors.text.primary : colors.error.main }}
                        >
                          {formatCurrency(balance)}
                        </Callout>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
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
    flexDirection: 'column',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[1],
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
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing[2],
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIconContainer: {
    marginRight: spacing[2],
  },
  accountInfo: {
    flex: 1,
  },
  accountBank: {
    marginTop: spacing[0.5],
    fontSize: 12,
  },
  accountRight: {
    marginLeft: spacing[2],
  },
});

