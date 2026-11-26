import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Platform,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar, Tag, Check } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useI18n } from '../../contexts/I18nContext';
import { categoryLabel } from '../../utils/categoryLabel';
import {
  amountDecimalSeparator,
  sanitizeAmountInput,
  formatAmountInput,
  parseAmountInput,
} from './amountInput';
import { ReceiptUpload } from './ReceiptUpload';
import { useOrganization } from '../../hooks/useOrganization';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

const PAYMENT_IDS = ['credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto'];

const getOrganizationName = (organization, fallback) => organization?.name || fallback;

const formatAmountForInput = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
  return formatAmountInput(Number(value));
};

const parseAmountValue = (value) => parseAmountInput(value);

const buildDefaultSplits = (centers = []) => {
  if (!centers.length) return [];

  const hasPreset = centers.some(
    (center) => Number(center.default_split_percentage || 0) > 0
  );

  if (hasPreset) {
    return centers.map((center) => ({
      cost_center_id: center.id,
      name: center.name,
      color: center.color,
      percentage: Number(center.default_split_percentage || 0),
    }));
  }

  const equalPercentage = Number((100 / centers.length).toFixed(2));
  return centers.map((center) => ({
    cost_center_id: center.id,
    name: center.name,
    color: center.color,
    percentage: equalPercentage,
  }));
};

const mapSplitsFromExpense = (splits = [], centers = [], amount = 0) => {
  if (!splits.length) return buildDefaultSplits(centers);

  const baseAmount = Number(amount) || 0;

  return splits.map((split) => {
    const center = centers.find((cc) => cc.id === split.cost_center_id);
    const percentage =
      baseAmount > 0
        ? ((Number(split.amount || 0) / baseAmount) * 100).toFixed(2)
        : split.percentage || 0;

    return {
      cost_center_id: split.cost_center_id,
      name: center?.name || '—',
      color: center?.color,
      percentage: Number(percentage),
    };
  });
};

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
    </TouchableOpacity>
  </View>
);

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
                {t('bills.form.noOptions')}
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

export function TransactionModal({
  visible,
  onClose,
  onSave,
  transaction,
  type = 'expense',
  categories = [],
  costCenters = [],
  cards = [],
  organization,
  isSoloUser = false,
}) {
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  const { showToast } = useToast();
  const { t, language, formatMoney, formatPercent, currencySymbol } = useI18n();
  const { user, organization: orgData } = useOrganization();
  const isExpense = type === 'expense';
  const organizationName = getOrganizationName(organization || orgData, t('bills.family'));
  const PAYMENT_OPTIONS = useMemo(
    () => PAYMENT_IDS.map((id) => ({ id, label: t(`bills.paymentMethods.${id}`) })),
    [t]
  );
  const costCentersKey = useMemo(
    () => (costCenters || []).map((cc) => cc.id).join('|'),
    [costCenters]
  );

  const ownerOptions = useMemo(() => {
    const base = (costCenters || []).map((cc) => ({
      id: cc.id,
      name: cc.name,
      color: cc.color,
    }));

    if (!isSoloUser) {
      base.push({
        id: 'organization',
        name: organizationName,
        color: '#6B7280',
        isShared: true,
      });
    }

    return base;
  }, [costCenters, isSoloUser, organizationName]);

  const [formData, setFormData] = useState({
    description: transaction?.description || '',
    amount: transaction?.amount ? formatAmountForInput(transaction.amount) : '',
    date: transaction?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    category_id: transaction?.category_id || null,
    cost_center_id: transaction?.cost_center_id || null,
    payment_method: transaction?.payment_method || (isExpense ? 'credit_card' : null),
    card_id: transaction?.card_id || null,
    owner_name: transaction?.is_shared
      ? organizationName
      : costCenters.find((cc) => cc.id === transaction?.cost_center_id)?.name || '',
    is_shared: Boolean(transaction?.is_shared),
    installments: transaction?.installment_info?.total_installments || 1,
    splits: mapSplitsFromExpense(
      transaction?.expense_splits || [],
      costCenters,
      transaction?.amount
    ),
    receipt_url: transaction?.receipt_url || null,
  });
  const [activeSheet, setActiveSheet] = useState(null);

  const filteredCategories = useMemo(() => {
    const filtered = (categories || []).filter((cat) => {
      if (!cat?.type || cat.type === 'both') return true;
      return type === 'income' ? cat.type === 'income' : cat.type === 'expense';
    });

    return [...filtered].sort((a, b) =>
      categoryLabel(a?.name || '').localeCompare(categoryLabel(b?.name || ''), language, { sensitivity: 'base' })
    );
  }, [categories, type, language]);

  const categoryOptions = useMemo(() => {
    if (!filteredCategories.length) return [];
    return filteredCategories.map((cat) => ({
      id: cat.id,
      label: categoryLabel(cat.name),
      description:
        cat.type === 'income'
          ? t('finances.tx.categoryIncome')
          : cat.type === 'expense'
            ? t('finances.tx.categoryExpense')
            : t('finances.tx.categoryBoth'),
    }));
  }, [filteredCategories, t]);

  const selectedCategory = useMemo(() => {
    return filteredCategories.find((cat) => cat.id === formData.category_id) || null;
  }, [filteredCategories, formData.category_id]);

  const ownerEntries = useMemo(
    () =>
      (ownerOptions || [])
        .map((option) => ({
          id: option.id || option.name,
          label: option.name,
          description: option.isShared ? t('finances.tx.sharedExpense') : t('finances.tx.individualOwner'),
          data: option,
        }))
        .sort((a, b) =>
          (a?.label || '').localeCompare(b?.label || '', language, { sensitivity: 'base' })
        ),
    [ownerOptions, t, language]
  );

  const ownerSelectionId = useMemo(() => {
    const entry = ownerEntries.find(
      (entry) => entry.data?.name === formData.owner_name
    );
    return entry?.id || null;
  }, [ownerEntries, formData.owner_name]);

  const selectedOwnerLabel = formData.owner_name
    ? (formData.is_shared ? t('finances.tx.ownerShared', { name: formData.owner_name }) : formData.owner_name)
    : '';

  const paymentSelection = useMemo(
    () => PAYMENT_OPTIONS.find((option) => option.id === formData.payment_method) || null,
    [formData.payment_method, PAYMENT_OPTIONS]
  );

  const cardEntries = useMemo(
    () =>
      (cards || []).map((card) => ({
        id: card.id,
        label: card.name || t('closing.card'),
        description: [card.bank, card.last_four ? `•••• ${card.last_four}` : null]
          .filter(Boolean)
          .join(' • '),
      })),
    [cards]
  );

  const selectedCard = useMemo(
    () => (cards || []).find((card) => card.id === formData.card_id) || null,
    [cards, formData.card_id]
  );

  const openSheet = (sheet) => setActiveSheet(sheet);
  const closeSheet = () => setActiveSheet(null);

  const handleSelectCategoryOption = (option) => {
    setFormData((prev) => ({
      ...prev,
      category_id: option?.id || null,
    }));
    closeSheet();
  };

  const handleSelectOwnerOption = (option) => {
    if (!option?.data) return;
    handleOwnerSelect(option.data);
    closeSheet();
  };

  const handleSelectPaymentOption = (option) => {
    setFormData((prev) => ({
      ...prev,
      payment_method: option.id,
      card_id: option.id === 'credit_card' ? prev.card_id : null,
      installments: option.id === 'credit_card' ? Math.max(1, prev.installments || 1) : 1,
    }));
    closeSheet();
  };

  const handleSelectCardOption = (option) => {
    setFormData((prev) => ({
      ...prev,
      card_id: option?.id || null,
    }));
    closeSheet();
  };

  const numericAmount = useMemo(
    () => parseAmountValue(formData.amount),
    [formData.amount]
  );

  const totalSplitPercentage = useMemo(
    () =>
      (formData.splits || []).reduce(
        (sum, split) => sum + Number(split.percentage || 0),
        0
      ),
    [formData.splits]
  );

  const isCreditPayment =
    isExpense && formData.payment_method === 'credit_card';

  const installmentsValue = useMemo(() => {
    const value = Number(formData.installments);
    if (Number.isNaN(value) || value <= 0) return 1;
    return Math.max(1, Math.round(value));
  }, [formData.installments]);

  const handleOwnerSelect = (option) => {
    if (!option) return;
    if (option.isShared) {
      setFormData((prev) => ({
        ...prev,
        owner_name: option.name,
        cost_center_id: null,
        is_shared: true,
        splits: prev.splits && prev.splits.length > 0
          ? prev.splits
          : buildDefaultSplits(costCenters),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      owner_name: option.name,
      cost_center_id: option.id,
      is_shared: false,
      splits: [],
    }));
  };

  const handleSplitPercentageChange = (costCenterId, value) => {
    const sanitized = value.replace(',', '.');
    const numeric = Number(sanitized);

    setFormData((prev) => ({
      ...prev,
      splits: (prev.splits || []).map((split) =>
        split.cost_center_id === costCenterId
          ? {
              ...split,
              percentage: Number.isNaN(numeric) ? 0 : numeric,
            }
          : split
      ),
    }));
  };

  const resetSplits = () => {
    setFormData((prev) => ({
      ...prev,
      splits: buildDefaultSplits(costCenters),
    }));
  };

  // Atualizar formData quando transaction mudar ou modal abrir
  useEffect(() => {
    if (!visible) return;

    if (transaction) {
      const amountFormatted = transaction.amount !== undefined && transaction.amount !== null
        ? formatAmountForInput(transaction.amount)
        : '';

      const selectedCostCenter = costCenters.find(
        (cc) => cc.id === transaction.cost_center_id
      );

      const ownerName = transaction.is_shared
        ? organizationName
        : selectedCostCenter?.name || transaction.owner || '';

      setFormData({
        description: transaction.description || '',
        amount: amountFormatted,
        date: transaction.date
          ? transaction.date.split('T')[0]
          : new Date().toISOString().split('T')[0],
        category_id: transaction.category_id || null,
        cost_center_id: transaction.is_shared ? null : transaction.cost_center_id || null,
        payment_method: transaction.payment_method || (isExpense ? 'credit_card' : null),
        card_id: transaction.card_id || null,
        owner_name: ownerName,
        is_shared: Boolean(transaction.is_shared),
        installments: transaction?.installment_info?.total_installments || 1,
        splits: transaction.is_shared
          ? mapSplitsFromExpense(
              transaction.expense_splits || [],
              costCenters,
              transaction.amount
            )
          : [],
      });
    } else {
      const defaultOwner =
        isSoloUser || !ownerOptions.length
          ? costCenters[0]?.name || ''
          : ownerOptions[0]?.name;

      const isSharedDefault =
        !isSoloUser && defaultOwner === organizationName;

      setFormData({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category_id: null,
        cost_center_id: isSharedDefault ? null : costCenters[0]?.id || null,
        payment_method: isExpense ? 'credit_card' : null,
        card_id: null,
        owner_name: defaultOwner,
        is_shared: isSharedDefault,
        installments: 1,
        splits: isSharedDefault ? buildDefaultSplits(costCenters) : [],
      });
    }
  }, [
    transaction,
    visible,
    isExpense,
    organizationName,
    isSoloUser,
    costCentersKey,
  ]);

  useEffect(() => {
    if (!visible && activeSheet) {
      setActiveSheet(null);
    }
  }, [visible, activeSheet]);

  const handleSave = () => {
    if (!formData.description?.trim() || !formData.amount) {
      showToast(t('finances.tx.descriptionAndAmount'), 'warning');
      return;
    }

    if (!formData.owner_name) {
      showToast(t('finances.tx.ownerRequired'), 'warning');
      return;
    }

    const amountValue = parseAmountValue(formData.amount);

    if (!amountValue || amountValue <= 0) {
      showToast(t('finances.form.amountPositive'), 'warning');
      return;
    }

    if (formData.is_shared) {
      if (!formData.splits || formData.splits.length === 0) {
        showToast(t('finances.tx.splitRequired'), 'warning');
        return;
      }

      if (Math.round(totalSplitPercentage) !== 100) {
        showToast(t('closing.allocation.splitMustBe100'), 'warning');
        return;
      }
    }

    if (isExpense && !formData.category_id) {
      showToast(t('finances.form.categoryRequired'), 'warning');
      return;
    }

    if (isCreditPayment) {
      if (!formData.card_id) {
        showToast(t('finances.tx.cardRequired'), 'warning');
        return;
      }
      if (!formData.installments || installmentsValue < 1) {
        showToast(t('finances.tx.installmentsRequired'), 'warning');
        return;
      }
    }

    const normalizedSplits = formData.is_shared
      ? (formData.splits || []).map((split) => ({
          ...split,
          percentage: Number(split.percentage || 0),
          amount: Number(
            ((amountValue * Number(split.percentage || 0)) / 100).toFixed(2)
          ),
        }))
      : [];

    onSave({
      ...formData,
      amount: Number(amountValue.toFixed(2)),
      type,
      installments: isCreditPayment ? installmentsValue : 1,
      splits: normalizedSplits,
    });

    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modal, { marginBottom: safeBottom }]} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="semiBold">
              {t(`finances.tx.${transaction ? 'edit' : 'new'}${type === 'income' ? 'Income' : 'Expense'}`)}
            </Title2>
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
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, description: text }))
                  }
                  placeholder={t('finances.tx.descriptionPlaceholder')}
                  accessibilityLabel={t('finances.form.description')}
                  icon={<Tag size={20} color={colors.text.secondary} />}
                />
              </View>

              {/* Amount */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">{t('finances.form.amount')}</Caption>
                <Input
                  value={formData.amount}
                  onChangeText={(text) => {
                    const cleaned = sanitizeAmountInput(text);
                    setFormData((prev) => ({ ...prev, amount: cleaned }));
                  }}
                  placeholder={`0${amountDecimalSeparator()}00`}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t('finances.form.amount')}
                  icon={<Text style={styles.currencyIcon}>{currencySymbol()}</Text>}
                />
              </View>

              {/* Date */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">{t('finances.form.date')}</Caption>
                <Input
                  value={formData.date}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, date: text }))
                  }
                  placeholder={t('finances.form.datePlaceholder')}
                  accessibilityLabel={t('finances.form.date')}
                  icon={<Calendar size={20} color={colors.text.secondary} />}
                />
              </View>

              {/* Category */}
              <SelectField
                label={t('bills.form.category')}
                value={
                  (selectedCategory?.name && categoryLabel(selectedCategory.name)) ||
                  (formData.category_id ? t('finances.tx.categoryUnavailable') : '')
                }
                placeholder={
                  filteredCategories.length === 0
                    ? t('common.loading')
                    : t('finances.form.chooseCategory')
                }
                disabled={filteredCategories.length === 0}
                onPress={() =>
                  filteredCategories.length > 0 && openSheet('category')
                }
              />

              {/* Responsible */}
              <SelectField
                label={t('bills.markPaidModal.owner')}
                value={selectedOwnerLabel}
                placeholder={
                  ownerEntries.length === 0
                    ? t('common.loading')
                    : t('bills.markPaidModal.ownerPlaceholder')
                }
                disabled={ownerEntries.length === 0}
                onPress={() => ownerEntries.length > 0 && openSheet('owner')}
              />

              {formData.is_shared && (
                <View style={styles.splitSection}>
                  <View style={styles.splitHeader}>
                    <Caption color="secondary" weight="medium">
                      {t('finances.tx.split')}
                    </Caption>
                    <TouchableOpacity onPress={resetSplits} disabled={!costCenters.length} accessibilityRole="button">
                      <Caption
                        style={[
                          styles.resetSplits,
                          !costCenters.length && styles.resetSplitsDisabled,
                        ]}
                      >
                        {t('finances.tx.useDefaultSplit')}
                      </Caption>
                    </TouchableOpacity>
                  </View>

                  {formData.splits && formData.splits.length > 0 ? (
                    formData.splits.map((split) => (
                      <View key={split.cost_center_id} style={styles.splitRow}>
                        <View style={styles.splitInfo}>
                          <Callout weight="medium">{split.name}</Callout>
                          <Caption color="secondary">
                            {formatMoney(
                              (numericAmount * Number(split.percentage || 0)) / 100 || 0
                            )}
                          </Caption>
                        </View>
                        <View style={styles.splitPercentageContainer}>
                          <TextInput
                            value={
                              split.percentage === 0 || split.percentage
                                ? String(split.percentage)
                                : ''
                            }
                            onChangeText={(text) =>
                              handleSplitPercentageChange(split.cost_center_id, text)
                            }
                            keyboardType="numeric"
                            placeholder="0"
                            accessibilityLabel={t('finances.tx.splitA11y', { name: split.name })}
                            style={styles.splitPercentageInput}
                          />
                          <Text style={styles.percentSuffix}>%</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Caption color="tertiary">
                      {t('finances.tx.splitNoMembers')}
                    </Caption>
                  )}

                  <Caption
                    style={[
                      styles.splitTotal,
                      Math.round(totalSplitPercentage) !== 100 && styles.splitTotalError,
                    ]}
                  >
                    {t('closing.member.total', { amount: formatPercent(totalSplitPercentage / 100, { maximumFractionDigits: 1 }) })}
                  </Caption>
                </View>
              )}

              {/* Payment Method */}
              {isExpense && (
                <SelectField
                  label={t('bills.form.paymentMethod')}
                  value={paymentSelection?.label || ''}
                  placeholder={t('bills.form.paymentMethodPlaceholder')}
                  onPress={() => openSheet('payment')}
                />
              )}

              {/* Card Selector */}
              {isExpense && formData.payment_method === 'credit_card' && (
                <SelectField
                  label={t('bills.form.card')}
                  value={selectedCard?.name || ''}
                  placeholder={
                    cardEntries.length === 0
                      ? t('common.loading')
                      : t('bills.form.cardPlaceholder')
                  }
                  disabled={cardEntries.length === 0}
                  onPress={() =>
                    cardEntries.length > 0 && openSheet('card')
                  }
                />
              )}

              {isCreditPayment && (
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">{t('finances.tx.installments')}</Caption>
                  <Input
                    value={String(formData.installments || '')}
                    onChangeText={(text) => {
                      const sanitized = text.replace(/[^0-9]/g, '');
                      setFormData((prev) => ({ ...prev, installments: sanitized }));
                    }}
                    placeholder="1"
                    keyboardType="number-pad"
                    accessibilityLabel={t('finances.tx.installments')}
                  />
                </View>
              )}

              {/* Receipt Upload - apenas para despesas */}
              {isExpense && (
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">{t('finances.tx.receipt')}</Caption>
                  <ReceiptUpload
                    initialImageUrl={formData.receipt_url}
                    organizationId={(organization || orgData)?.id}
                    userId={user?.id}
                    onUploadComplete={(url, path) => {
                      setFormData((prev) => ({ ...prev, receipt_url: url }));
                    }}
                    onRemove={() => {
                      setFormData((prev) => ({ ...prev, receipt_url: null }));
                    }}
                  />
                </View>
              )}

            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }]}>
            <Button
              title={t('common.cancel')}
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title={t('common.save')}
              variant="primary"
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>

          <OptionSheet
            visible={activeSheet === 'category'}
            title={t('finances.form.categories')}
            options={categoryOptions}
            selectedId={formData.category_id || null}
            onSelect={handleSelectCategoryOption}
            onClose={closeSheet}
          />

          <OptionSheet
            visible={activeSheet === 'owner'}
            title={t('bills.markPaidModal.ownerSheetTitle')}
            options={ownerEntries}
            selectedId={ownerSelectionId}
            onSelect={handleSelectOwnerOption}
            onClose={closeSheet}
          />

          <OptionSheet
            visible={activeSheet === 'payment'}
            title={t('bills.form.paymentMethod')}
            options={PAYMENT_OPTIONS}
            selectedId={paymentSelection?.id || null}
            onSelect={handleSelectPaymentOption}
            onClose={closeSheet}
          />

          <OptionSheet
            visible={activeSheet === 'card'}
            title={t('bills.form.cardPlaceholder')}
            options={cardEntries}
            selectedId={formData.card_id || null}
            onSelect={handleSelectCardOption}
            onClose={closeSheet}
          />
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
    maxHeight: height * 0.85,
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
  },
  contentContainer: {
    paddingBottom: spacing[6],
  },

  form: {
    gap: spacing[3],
    paddingBottom: spacing[4],
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

  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  selectorChip: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  selectorChipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },

  currencyIcon: {
    fontWeight: '600',
    color: colors.text.primary,
    fontSize: 16,
  },

  splitSection: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    gap: spacing[2],
  },

  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resetSplits: {
    color: colors.brand.primary,
    fontWeight: '600',
  },

  resetSplitsDisabled: {
    opacity: 0.4,
  },

  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },

  splitInfo: {
    flex: 1,
  },

  splitPercentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    minWidth: 100,
    justifyContent: 'space-between',
  },

  splitPercentageInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },

  percentSuffix: {
    marginLeft: spacing[1],
    fontWeight: '600',
    color: colors.text.secondary,
  },

  splitTotal: {
    alignSelf: 'flex-end',
    fontSize: 14,
    color: colors.text.secondary,
  },

  splitTotalError: {
    color: colors.error.main,
    fontWeight: '600',
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
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
  },

  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },

  sheetTitle: {
    textAlign: 'center',
    marginBottom: spacing[2],
  },

  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  sheetOptionSelected: {
    backgroundColor: colors.background.secondary,
  },

  field: {
    gap: spacing[1],
  },

  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingTop: spacing[3],
    paddingHorizontal: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    // paddingBottom será aplicado dinamicamente com safe area
  },
});

