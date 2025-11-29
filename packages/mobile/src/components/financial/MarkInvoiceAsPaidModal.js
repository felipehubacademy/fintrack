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
                Nenhuma opção disponível
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

  const formatAmountForInput = (value) => {
    if (!value || value === 0) return '';
    return Number(value).toFixed(2).replace('.', ',');
  };

  const parseAmountValue = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const normalized = String(value)
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

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
      setFetchError('Não foi possível carregar as contas bancárias. Tente novamente.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const processCurrencyInput = (value) => {
    if (!value) return '';
    // Remove tudo exceto números, vírgulas e pontos
    let cleaned = value.replace(/[^0-9,.]/g, '');
    // Remove pontos (milhares) e mantém apenas vírgula (decimal)
    cleaned = cleaned.replace(/\./g, '');
    // Garante apenas uma vírgula
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }
    // Limita a 2 casas decimais
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + ',' + parts[1].substring(0, 2);
    }
    return cleaned;
  };

  const formatCurrencyInput = (value) => {
    if (!value || value === 0) return '';
    const num = typeof value === 'string' ? parseAmountValue(value) : value;
    if (num === 0) return '';
    return num.toFixed(2).replace('.', ',');
  };

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
      showToast('Pagamento registrado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao processar pagamento. Tente novamente.', 'error');
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
                  PAGAMENTO DE FATURA
                </Caption>
                <Headline weight="semiBold">{card.name}</Headline>
              </View>
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
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onStartShouldSetResponderCapture={() => true}
            onMoveShouldSetResponderCapture={() => true}
          >
            <View style={styles.infoGrid}>
              {/* Saldo restante */}
              <Card style={styles.infoCard}>
                <Caption weight="semiBold" color="secondary" style={styles.infoLabel}>
                  {invoicePaidAmount > 0 ? 'SALDO RESTANTE' : 'VALOR TOTAL DA FATURA'}
                </Caption>
                <Headline weight="bold" style={{ marginTop: spacing[1] }}>
                  {formatCurrency(remainingAmount)}
                </Headline>
                {invoicePaidAmount > 0 && (
                  <Caption style={{ color: colors.success.main, marginTop: spacing[0.5] }}>
                    Já pago: {formatCurrency(invoicePaidAmount)}
                  </Caption>
                )}
                <Caption color="secondary" style={{ marginTop: spacing[2] }}>
                  Ao confirmar, uma transação bancária será criada e o limite do cartão será atualizado.
                </Caption>
              </Card>

              {/* Valor a pagar */}
              <Card style={styles.amountCard}>
                <Caption weight="semiBold" color="secondary" style={styles.infoLabel}>
                  VALOR A PAGAR AGORA
                </Caption>
                <View style={styles.amountInputContainer}>
                  <View style={styles.inputFieldWrapper}>
                    <Input
                      value={amountInput}
                      onChangeText={handleAmountChange}
                      onFocus={handleAmountFocus}
                      onBlur={handleAmountBlur}
                      placeholder="0,00"
                      keyboardType="decimal-pad"
                      icon={<Text style={styles.currencyIcon}>R$</Text>}
                      error={!isAmountValid && amountInput ? `Informe um valor entre R$ 0,01 e ${formatCurrency(remainingAmount)}` : null}
                      inputStyle={styles.amountInput}
                      style={styles.inputField}
                    />
                  </View>
                </View>
                <View style={styles.remainingAfterPayment}>
                  <Caption color="secondary">Saldo restante após este pagamento</Caption>
                  <Callout weight="semiBold">{formatCurrency(remainingAfterPayment)}</Callout>
                </View>
              </Card>
            </View>

            {/* Forma de pagamento */}
            <View style={styles.paymentMethodSection}>
              <SelectField
                label="Forma de Pagamento"
                value={paymentMethod === 'bank_account' ? 'Conta bancária' : paymentMethod === 'other' ? 'Outros' : ''}
                placeholder="Selecionar forma de pagamento"
                onPress={() => setActiveSheet('payment')}
              />

              {paymentMethod === 'bank_account' && (
                <SelectField
                  label="Debitar da Conta"
                  value={bankAccounts.find(acc => acc.id === selectedAccount)?.name ? 
                    `${bankAccounts.find(acc => acc.id === selectedAccount).name} • ${bankAccounts.find(acc => acc.id === selectedAccount).bank}` : 
                    ''}
                  placeholder={loadingAccounts ? 'Carregando contas...' : bankAccounts.length === 0 ? 'Nenhuma conta disponível' : 'Selecionar conta'}
                  disabled={loadingAccounts || bankAccounts.length === 0}
                  onPress={() => bankAccounts.length > 0 && setActiveSheet('account')}
                />
              )}

              {paymentMethod === 'other' && (
                <Card style={styles.infoCard}>
                  <Caption color="secondary">
                    ℹ️ O pagamento será registrado na fatura, mas nenhuma transação bancária será criada.
                  </Caption>
                </Card>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              style={styles.cancelButton}
            />
            <Button
              title={isSubmitting ? 'Processando...' : 'Confirmar'}
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
        title="Forma de Pagamento"
        options={[
          { id: 'bank_account', label: 'Conta bancária' },
          { id: 'other', label: 'Outros (dinheiro, pix externo, etc.)' },
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
        title="Selecionar Conta"
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

