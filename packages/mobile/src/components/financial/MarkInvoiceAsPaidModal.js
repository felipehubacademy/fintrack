import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { CreditCard, X, Check, ChevronDown } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline } from '../ui/Text';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import { useToast } from '../ui/Toast';
import { sanitizeAmountInput, formatAmountInput, parseAmountInput, amountDecimalSeparator } from './amountInput';
import { useI18n } from '../../contexts/I18nContext';

const { height } = Dimensions.get('window');

// Componente SelectField para dropdowns
const SelectField = ({ label, value, placeholder, onPress, disabled }) => (
  <View style={styles.field}>
    <Caption color="secondary" weight="medium">
      {label}
    </Caption>
    <TouchableOpacity
      style={[
        styles.selectField,
        disabled && styles.selectFieldDisabled,
        !value && styles.selectFieldEmpty,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Callout
        numberOfLines={1}
        style={!value ? styles.selectPlaceholder : null}
      >
        {value || placeholder}
      </Callout>
      <ChevronDown size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  </View>
);

// Componente OptionSheet
const OptionSheet = ({
  visible,
  title,
  options = [],
  selectedId,
  onSelect,
  onClose,
}) => {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Title2 weight="semiBold" style={styles.sheetTitle}>
            {title}
          </Title2>

          <ScrollView
            style={{ maxHeight: height * 0.5 }}
            showsVerticalScrollIndicator={false}
          >
            {options.length === 0 ? (
              <Caption color="secondary" style={{ textAlign: 'center', marginBottom: spacing[2] }}>
                {t('finances.form.noOptions')}
              </Caption>
            ) : (
              options.map((option) => {
                const optionId = option.id ?? option.value;
                const isSelected = selectedId === optionId;
                return (
                  <TouchableOpacity
                    key={optionId || option.label}
                    style={[
                      styles.sheetOption,
                      isSelected && styles.sheetOptionSelected,
                    ]}
                    onPress={() => {
                      onSelect(option);
                      onClose?.();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Callout weight="medium">{option.label}</Callout>
                      {option.description ? (
                        <Caption color="secondary">{option.description}</Caption>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Check size={20} color={colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * MarkInvoiceAsPaidModal - Modal para pagar fatura (total ou parcial)
 */
export default function MarkInvoiceAsPaidModal({
  visible,
  onClose,
  onConfirm,
  invoice,
  card,
  organization = null
}) {
  const { showToast } = useToast();
  const { t, formatMoney, currencySymbol } = useI18n();
  const [paymentMethod, setPaymentMethod] = useState('bank_account');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [rawAmount, setRawAmount] = useState(0);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);

  const invoiceTotal = invoice?.total || 0;
  const invoicePaidAmount = invoice?.paid_amount || 0;
  const remainingAmount = invoiceTotal - invoicePaidAmount;

  const normalizeCurrencyValue = (value) => {
    if (!value && value !== 0) return 0;
    return Number(Number(value).toFixed(2));
  };

  const formatAmountForInput = (value) => formatAmountInput(value);

  const parseAmountValue = (value) => parseAmountInput(value);

  const isLessOrEqualWithTolerance = (value, limit, tolerance = 0.01) => {
    return value <= limit + tolerance;
  };

  useEffect(() => {
    if (visible && invoice) {
      // Usar o saldo restante ao invés do total (igual ao web)
      const value = normalizeCurrencyValue(remainingAmount);
      setRawAmount(value);
      setAmountInput(formatCurrencyInput(value));
    }
  }, [visible, invoice, remainingAmount]);

  useEffect(() => {
    if (visible && organization?.id) {
      loadBankAccounts();
    }
  }, [visible, organization?.id]);

  const loadBankAccounts = async () => {
    try {
      setLoadingAccounts(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, bank, account_type')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setBankAccounts(data || []);
      if (data?.length) {
        setSelectedAccount(data[0].id);
      } else {
        setSelectedAccount('');
      }
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
      setFetchError(t('finances.form.accountsLoadError'));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const processCurrencyInput = (value) => sanitizeAmountInput(value);

  const formatCurrencyInput = (value) => formatAmountInput(typeof value === 'string' ? parseAmountValue(value) : value);

  const handleAmountChange = (text) => {
    const processed = processCurrencyInput(text);
    setAmountInput(processed);
    const parsed = parseAmountValue(processed);
    setRawAmount(normalizeCurrencyValue(parsed));
  };

  const handleAmountFocus = () => {
    // Quando focar, mostrar valor numérico limpo
    if (rawAmount > 0) {
      setAmountInput(processCurrencyInput(formatAmountForInput(rawAmount)));
    }
  };

  const handleAmountBlur = () => {
    // Quando perder foco, formatar bonito
    if (rawAmount > 0) {
      setAmountInput(formatCurrencyInput(rawAmount));
    } else {
      setAmountInput('');
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    
    const normalizedRaw = normalizeCurrencyValue(rawAmount);
    const normalizedRemainingAmount = normalizeCurrencyValue(remainingAmount);

    if (normalizedRaw <= 0 || !isLessOrEqualWithTolerance(normalizedRaw, normalizedRemainingAmount)) return;
    if (paymentMethod === 'bank_account' && !selectedAccount) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        payment_method: paymentMethod,
        bank_account_id: paymentMethod === 'bank_account' ? selectedAccount : null,
        amount: normalizedRaw
      });
      showToast(t('finances.payInvoice.saved'), 'success');
    } catch (error) {
      showToast(t('finances.invoice.paymentError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('[MarkInvoiceAsPaidModal] Render check:', { 
    visible, 
    hasInvoice: !!invoice, 
    hasCard: !!card,
    remainingAmount,
    amountInput,
    paymentMethod,
    bankAccountsCount: bankAccounts.length
  });
  
  if (!visible || !invoice || !card) {
    console.log('[MarkInvoiceAsPaidModal] Retornando null - condições não atendidas');
    return null;
  }

  const normalizedRawAmount = normalizeCurrencyValue(rawAmount);
  const normalizedRemainingAmount = normalizeCurrencyValue(remainingAmount);

  const isAmountValid =
    normalizedRawAmount > 0 && isLessOrEqualWithTolerance(normalizedRawAmount, normalizedRemainingAmount);
  const isPaymentMethodValid = paymentMethod === 'other' || (paymentMethod === 'bank_account' && !!selectedAccount);
  const canConfirm = isPaymentMethodValid && isAmountValid && !loadingAccounts && !isSubmitting;
  const remainingAfterPayment = Math.max(normalizedRemainingAmount - normalizedRawAmount, 0);

  console.log('[MarkInvoiceAsPaidModal] Render:', { 
    visible, 
    hasInvoice: !!invoice, 
    hasCard: !!card,
  });

  if (!visible || !invoice || !card) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <CreditCard size={20} color={colors.brand.primary} />
              </View>
              <View style={styles.headerText}>
                <Caption weight="semiBold" style={styles.headerLabel}>
                  {t('finances.payInvoice.eyebrow')}
                </Caption>
                <Headline weight="semiBold">{card.name}</Headline>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
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
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onStartShouldSetResponderCapture={() => true}
            onMoveShouldSetResponderCapture={() => true}
          >
            <View style={styles.infoGrid}>
              {/* Saldo restante */}
              <Card style={styles.infoCard}>
                <Caption weight="semiBold" color="secondary" style={styles.infoLabel}>
                  {invoicePaidAmount > 0 ? t('finances.payInvoice.remaining') : t('finances.payInvoice.total')}
                </Caption>
                <Headline weight="bold" style={{ marginTop: spacing[1] }}>
                  {formatMoney(remainingAmount)}
                </Headline>
                {invoicePaidAmount > 0 && (
                  <Caption style={{ color: colors.success.main, marginTop: spacing[0.5] }}>
                    {t('finances.payInvoice.alreadyPaid', { amount: formatMoney(invoicePaidAmount) })}
                  </Caption>
                )}
                <Caption color="secondary" style={{ marginTop: spacing[2] }}>
                  {t('finances.payInvoice.hint')}
                </Caption>
              </Card>

              {/* Valor a pagar */}
              <Card style={styles.amountCard}>
                <Caption weight="semiBold" color="secondary" style={styles.infoLabel}>
                  {t('finances.payInvoice.payNow')}
                </Caption>
                <View style={styles.amountInputContainer}>
                  <View style={styles.inputFieldWrapper}>
                    <Input
                      value={amountInput}
                      onChangeText={handleAmountChange}
                      onFocus={handleAmountFocus}
                      onBlur={handleAmountBlur}
                      placeholder={`0${amountDecimalSeparator()}00`}
                      keyboardType="decimal-pad"
                      icon={<Text style={styles.currencyIcon}>{currencySymbol()}</Text>}
                      error={!isAmountValid && amountInput ? t('finances.payInvoice.amountRange', { min: formatMoney(0.01), max: formatMoney(remainingAmount) }) : null}
                      inputStyle={styles.amountInput}
                      style={styles.inputField}
                    />
                  </View>
                </View>
                <View style={styles.remainingAfterPayment}>
                  <Caption color="secondary">{t('finances.payInvoice.remainingAfter')}</Caption>
                  <Callout weight="semiBold">{formatMoney(remainingAfterPayment)}</Callout>
                </View>
              </Card>
            </View>

            {/* Forma de pagamento */}
            <View style={styles.paymentMethodSection}>
              <SelectField
                label={t('finances.payInvoice.method')}
                value={paymentMethod === 'bank_account' ? t('finances.payInvoice.methodBank') : paymentMethod === 'other' ? t('finances.payInvoice.methodOtherShort') : ''}
                placeholder={t('finances.payInvoice.methodPlaceholder')}
                onPress={() => setActiveSheet('payment')}
              />

              {paymentMethod === 'bank_account' && (
                <SelectField
                  label={t('finances.payInvoice.fromAccount')}
                  value={bankAccounts.find(acc => acc.id === selectedAccount)?.name ? 
                    `${bankAccounts.find(acc => acc.id === selectedAccount).name} • ${bankAccounts.find(acc => acc.id === selectedAccount).bank}` : 
                    ''}
                  placeholder={loadingAccounts ? t('common.loading') : bankAccounts.length === 0 ? t('finances.form.noAccounts') : t('finances.form.chooseAccount')}
                  disabled={loadingAccounts || bankAccounts.length === 0}
                  onPress={() => bankAccounts.length > 0 && setActiveSheet('account')}
                />
              )}

              {paymentMethod === 'other' && (
                <Card style={styles.infoCard}>
                  <Caption color="secondary">
                    {t('finances.payInvoice.otherHint')}
                  </Caption>
                </Card>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title={t('common.cancel')}
              variant="outline"
              onPress={onClose}
              style={styles.cancelButton}
            />
            <Button
              title={isSubmitting ? t('common.loading') : t('common.confirm')}
              onPress={handleConfirm}
              disabled={!canConfirm}
              loading={isSubmitting}
              style={styles.confirmButton}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Option Sheets */}
      <OptionSheet
        visible={activeSheet === 'payment'}
        title={t('finances.payInvoice.method')}
        options={[
          { id: 'bank_account', label: t('finances.payInvoice.methodBank') },
          { id: 'other', label: t('finances.payInvoice.methodOther') },
        ]}
        selectedId={paymentMethod}
        onSelect={(option) => {
          setPaymentMethod(option.id);
          if (option.id === 'other') {
            setSelectedAccount('');
          }
        }}
        onClose={() => setActiveSheet(null)}
      />

      <OptionSheet
        visible={activeSheet === 'account'}
        title={t('finances.form.chooseAccount')}
        options={bankAccounts.map(acc => ({
          id: acc.id,
          label: `${acc.name} • ${acc.bank}`,
        }))}
        selectedId={selectedAccount}
        onSelect={(option) => setSelectedAccount(option.id)}
        onClose={() => setActiveSheet(null)}
      />
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
    maxHeight: height * 0.9,
    width: '100%',
    minHeight: 400,
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  headerText: {
    flex: 1,
  },
  headerLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.brand.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
  },
  contentContainer: {
    paddingBottom: spacing[6],
    gap: spacing[4],
  },
  infoGrid: {
    gap: spacing[3],
    flexDirection: 'column',
  },
  infoCard: {
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
  },
  amountCard: {
    padding: spacing[3],
  },
  infoLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputContainer: {
    marginTop: spacing[2],
  },
  inputFieldWrapper: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
    overflow: 'hidden',
  },
  inputField: {
    backgroundColor: 'transparent',
  },
  field: {
    gap: spacing[1],
  },
  selectField: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.background.secondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  selectFieldEmpty: {
    borderStyle: 'dashed',
  },
  selectPlaceholder: {
    color: colors.text.tertiary,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: height * 0.7,
    paddingBottom: spacing[4],
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  sheetTitle: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetOptionSelected: {
    backgroundColor: colors.brand.bg,
  },
  currencyIcon: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '600',
  },
  remainingAfterPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  paymentMethodSection: {
    gap: spacing[2],
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningCard: {
    padding: spacing[2],
    backgroundColor: colors.warning.bg,
    borderColor: colors.warning.main,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
    paddingBottom: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.neutral[50],
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

