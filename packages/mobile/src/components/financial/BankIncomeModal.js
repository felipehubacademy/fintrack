import React, { useState, useEffect } from 'react';
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
import { X, Calendar, Tag, Wallet, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { supabase } from '../../services/supabase';
import { categoryLabel } from '../../utils/categoryLabel';
import { sanitizeAmountInput, parseAmountInput, amountDecimalSeparator } from './amountInput';
import { useI18n } from '../../contexts/I18nContext';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

const getBrazilTodayString = () => {
  const now = new Date();
  const brazilOffset = -3 * 60; // UTC-3
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (brazilOffset * 60000));
  const year = brazilTime.getFullYear();
  const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
  const day = String(brazilTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseAmountValue = (value) => parseAmountInput(value);

const processCurrencyInput = (value) => sanitizeAmountInput(value);

// Componente SelectField (igual ao TransactionModal)
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
      onPress={
        disabled
          ? undefined
          : () => {
              console.log('SelectField pressed:', label);
              onPress?.();
            }
      }
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Callout
        numberOfLines={1}
        style={!value ? styles.selectPlaceholder : null}
      >
        {value || placeholder}
      </Callout>
    </TouchableOpacity>
  </View>
);

const InlineOptionSheet = ({
  visible,
  title,
  options = [],
  selectedId,
  onSelect,
  onClose,
}) => {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  if (!visible) return null;

  return (
    <View style={styles.inlineSheetOverlay} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.inlineSheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          styles.inlineSheetContainer,
          { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4], marginBottom: safeBottom },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Title2 weight="semiBold">{title}</Title2>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.sheetContent}
          contentContainerStyle={styles.sheetContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
          scrollEnabled={true}
          bounces={false}
        >
          {options.length === 0 ? (
            <View style={styles.sheetEmpty}>
              <Caption color="secondary">{t('finances.form.noOptions')}</Caption>
            </View>
          ) : (
            options.map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sheetOption,
                    isSelected && styles.sheetOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                  activeOpacity={0.7}
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
      </View>
    </View>
  );
};

export default function BankIncomeModal({
  visible,
  onClose,
  onSuccess,
  organization,
  costCenters = [],
  incomeCategories = [],
  selectedAccount = null,
  currentUser,
}) {
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  const { showToast } = useToast();
  const { t, currencySymbol, language } = useI18n();
  const [saving, setSaving] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: getBrazilTodayString(),
    category_id: '',
    bank_account_id: '',
  });

  useEffect(() => {
    if (visible) {
      setForm({
        description: '',
        amount: '',
        date: getBrazilTodayString(),
        category_id: '',
        bank_account_id: selectedAccount?.id || '',
      });
    }
  }, [visible, selectedAccount]);

  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (visible) {
      if (selectedAccount) {
        setAvailableAccounts([selectedAccount]);
      } else if (organization?.id) {
        fetchAvailableAccounts();
      } else {
        // Se não tem organização ainda, limpar contas
        setAvailableAccounts([]);
      }
    }
  }, [visible, organization?.id, selectedAccount]);

  const fetchAvailableAccounts = async () => {
    if (!organization?.id) {
      console.warn('BankIncomeModal: organization.id não disponível');
      setAvailableAccounts([]);
      return;
    }

    try {
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erro ao buscar contas bancárias:', error);
        throw error;
      }
      
      console.log('BankIncomeModal: Contas carregadas:', data?.length || 0);
      setAvailableAccounts(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      setAvailableAccounts([]);
      showToast(t('finances.form.accountsLoadError'), 'error');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSave = async () => {
    if (!form.description?.trim()) {
      showToast(t('finances.form.descriptionRequired'), 'error');
      return;
    }

    const amount = parseAmountValue(form.amount);
    if (!form.amount || amount <= 0) {
      showToast(t('finances.form.amountPositive'), 'error');
      return;
    }

    if (!form.category_id) {
      showToast(t('finances.form.categoryRequired'), 'error');
      return;
    }

    if (!form.bank_account_id) {
      showToast(t('finances.income.accountRequired'), 'error');
      return;
    }

    try {
      setSaving(true);

      // 1. Criar income
      const incomeData = {
        description: form.description.trim(),
        amount,
        date: form.date,
        category_id: form.category_id,
        is_shared: false,
        cost_center_id:
          costCenters.find((cc) => cc.user_id === currentUser?.id && cc.is_active !== false)
            ?.id || null,
        bank_account_id: form.bank_account_id,
        organization_id: organization.id,
        user_id: currentUser.id,
        status: 'confirmed',
        source: 'manual',
      };

      const { data: income, error: incomeError } = await supabase
        .from('incomes')
        .insert(incomeData)
        .select()
        .single();

      if (incomeError) throw incomeError;

      // 2. Criar transação bancária (crédito na conta)
      const { error: transactionError } = await supabase.rpc('create_bank_transaction', {
        p_bank_account_id: form.bank_account_id,
        p_transaction_type: 'income_deposit',
        p_amount: amount,
        p_description: form.description.trim(),
        p_date: form.date,
        p_organization_id: organization.id,
        p_user_id: currentUser.id,
        p_expense_id: null,
        p_bill_id: null,
        p_income_id: income.id,
        p_related_account_id: null,
      });

      if (transactionError) throw transactionError;

      showToast(t('finances.income.saved'), 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      showToast(t('finances.income.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = incomeCategories?.find((c) => c.id === form.category_id) || null;
  // Priorizar selectedAccount passado como prop, senão usar o do form
  const selectedAccountObj = selectedAccount || availableAccounts?.find((acc) => acc.id === form.bank_account_id) || null;

  // Debug logs
  useEffect(() => {
    if (visible) {
      console.log('BankIncomeModal aberto:', {
        incomeCategoriesCount: incomeCategories?.length || 0,
        availableAccountsCount: availableAccounts?.length || 0,
        organizationId: organization?.id,
        hasUser: !!currentUser,
      });
    }
  }, [visible, incomeCategories, availableAccounts, organization, currentUser]);

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modal, { marginBottom: safeBottom }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Title2 weight="semiBold">{t('finances.income.title')}</Title2>
                {selectedAccountObj && (
                  <Caption color="secondary" style={styles.accountName}>
                    {selectedAccountObj.name}
                  </Caption>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={[styles.contentContainer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[6]) : spacing[6] }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
              scrollEnabled={true}
            >
              <View style={styles.form}>
                {/* Description */}
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">{t('finances.form.description')}</Caption>
                  <Input
                    value={form.description}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                    placeholder={t('finances.income.descriptionPlaceholder')}
                    icon={<Tag size={20} color={colors.text.secondary} />}
                    editable={!saving}
                  />
                </View>

                {/* Amount */}
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">{t('finances.form.amount')}</Caption>
                  <Input
                    value={form.amount}
                    onChangeText={(text) =>
                      setForm((prev) => ({ ...prev, amount: processCurrencyInput(text) }))
                    }
                    placeholder={`0${amountDecimalSeparator()}00`}
                    keyboardType="decimal-pad"
                    icon={<Text style={styles.currencyIcon}>{currencySymbol()}</Text>}
                    editable={!saving}
                  />
                </View>

                {/* Date */}
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">{t('finances.form.date')}</Caption>
                  <Input
                    value={form.date}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, date: text }))}
                    placeholder={t('finances.form.datePlaceholder')}
                    icon={<Calendar size={20} color={colors.text.secondary} />}
                    editable={!saving}
                  />
                </View>

                {/* Category */}
                <SelectField
                  label={t('finances.form.category')}
                  value={selectedCategory?.name ? categoryLabel(selectedCategory.name) : ''}
                  placeholder={
                    !incomeCategories || incomeCategories.length === 0
                      ? t('finances.income.noCategories')
                      : t('finances.form.chooseCategory')
                  }
                  disabled={!incomeCategories || incomeCategories.length === 0}
                  onPress={() => {
                    if (incomeCategories && incomeCategories.length > 0) {
                      console.log('Abrindo OptionSheet de categorias');
                      setActiveSheet('category');
                    }
                  }}
                />

                {/* Bank Account */}
                {!selectedAccount && (
                  <SelectField
                    label={t('finances.income.account')}
                    value={selectedAccountObj ? `${selectedAccountObj.name}${selectedAccountObj.bank ? ` - ${selectedAccountObj.bank}` : ''}` : ''}
                    placeholder={
                      loadingAccounts
                        ? t('common.loading')
                        : availableAccounts.length === 0
                          ? t('finances.form.noAccounts')
                          : t('finances.form.chooseAccount')
                    }
                    disabled={loadingAccounts || availableAccounts.length === 0}
                    onPress={() => {
                      if (!loadingAccounts && availableAccounts.length > 0) {
                        console.log('Abrindo OptionSheet de contas');
                        setActiveSheet('account');
                      }
                    }}
                  />
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }]}>
              <Button
                title={t('common.cancel')}
                variant="outline"
                onPress={onClose}
                disabled={saving}
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.save')}
                variant="primary"
                onPress={handleSave}
                disabled={saving}
                style={{ flex: 1 }}
              />
            </View>
            {/* Inline Option Sheets */}
            {activeSheet === 'category' && (
              <InlineOptionSheet
                visible
                title={t('finances.form.categories')}
                options={
                  incomeCategories && incomeCategories.length > 0
                    ? incomeCategories
                        .map((cat) => ({
                          id: cat.id,
                          label: cat.name ? categoryLabel(cat.name) : t('finances.form.noName'),
                        }))
                        .sort((a, b) => a.label.localeCompare(b.label, language))
                    : []
                }
                selectedId={form.category_id}
                onSelect={(option) => {
                  console.log('Categoria selecionada:', option);
                  setForm((prev) => ({ ...prev, category_id: option.id }));
                }}
                onClose={() => setActiveSheet(null)}
              />
            )}

            {activeSheet === 'account' && !selectedAccount && (
              <InlineOptionSheet
                visible
                title={t('finances.accountsSheet.title')}
                options={
                  availableAccounts && availableAccounts.length > 0
                    ? availableAccounts.map((acc) => ({
                        id: acc.id,
                        label: `${acc.name || t('finances.form.noName')}${acc.bank ? ` - ${acc.bank}` : ''}`,
                      }))
                    : []
                }
                selectedId={form.bank_account_id}
                onSelect={(option) => {
                  console.log('Conta selecionada:', option);
                  setForm((prev) => ({ ...prev, bank_account_id: option.id }));
                }}
                onClose={() => setActiveSheet(null)}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: height * 0.85,
    zIndex: 1001,
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
  headerTitleContainer: {
    flex: 1,
  },
  accountName: {
    marginTop: spacing[0.5],
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
  },
  form: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  field: {
    marginBottom: spacing[3],
  },
  selectField: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.background.secondary,
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
  currencyIcon: {
    fontWeight: '600',
    color: colors.text.primary,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    zIndex: 10001,
    elevation: 10001,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetContent: {
    maxHeight: height * 0.5,
  },
  sheetContentContainer: {
    paddingBottom: spacing[2],
  },
  sheetEmpty: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    minHeight: 48,
  },
  sheetOptionSelected: {
    backgroundColor: colors.background.secondary,
  },

  inlineSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  inlineSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  inlineSheetContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
  },
});
