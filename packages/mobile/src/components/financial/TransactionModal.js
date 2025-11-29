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
import { formatCurrency } from '@fintrack/shared/utils';
import { useToast } from '../ui/Toast';
import { ReceiptUpload } from './ReceiptUpload';
import { useOrganization } from '../../hooks/useOrganization';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

const PAYMENT_OPTIONS = [
  { id: 'credit_card', label: 'Cartão de Crédito' },
  { id: 'debit_card', label: 'Cartão de Débito' },
  { id: 'pix', label: 'PIX' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'bank_transfer', label: 'Transferência' },
  { id: 'boleto', label: 'Boleto' },
];

const getOrganizationName = (organization) => organization?.name || 'Organização';

const formatAmountForInput = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
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
      name: center?.name || 'Responsável',
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
  const { user, organization: orgData } = useOrganization();
  const isExpense = type === 'expense';
  const organizationName = getOrganizationName(organization || orgData);
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
      (a?.name || '').localeCompare(b?.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [categories, type]);

  const categoryOptions = useMemo(() => {
    if (!filteredCategories.length) return [];
    return filteredCategories.map((cat) => ({
      id: cat.id,
      label: cat.name,
      description:
        cat.type === 'income'
          ? 'Entrada'
          : cat.type === 'expense'
            ? 'Despesa'
            : 'Entradas e despesas',
    }));
  }, [filteredCategories]);

  const selectedCategory = useMemo(() => {
    return filteredCategories.find((cat) => cat.id === formData.category_id) || null;
  }, [filteredCategories, formData.category_id]);

  const ownerEntries = useMemo(
    () =>
      (ownerOptions || [])
        .map((option) => ({
          id: option.id || option.name,
          label: option.name,
          description: option.isShared ? 'Despesa compartilhada' : 'Responsável individual',
          data: option,
        }))
        .sort((a, b) =>
          (a?.label || '').localeCompare(b?.label || '', 'pt-BR', { sensitivity: 'base' })
        ),
    [ownerOptions]
  );

  const ownerSelectionId = useMemo(() => {
    const entry = ownerEntries.find(
      (entry) => entry.data?.name === formData.owner_name
    );
    return entry?.id || null;
  }, [ownerEntries, formData.owner_name]);

  const selectedOwnerLabel = formData.owner_name
    ? `${formData.owner_name}${formData.is_shared ? ' · Compartilhado' : ''}`
    : '';

  const paymentSelection = useMemo(
    () => PAYMENT_OPTIONS.find((option) => option.id === formData.payment_method) || null,
    [formData.payment_method]
  );

  const cardEntries = useMemo(
    () =>
      (cards || []).map((card) => ({
        id: card.id,
        label: card.name || 'Cartão',
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
      showToast('Preencha a descrição e o valor', 'warning');
      return;
    }

    if (!formData.owner_name) {
      showToast('Selecione um responsável', 'warning');
      return;
    }

    const amountValue = parseAmountValue(formData.amount);

    if (!amountValue || amountValue <= 0) {
      showToast('Valor inválido', 'warning');
      return;
    }

    if (formData.is_shared) {
      if (!formData.splits || formData.splits.length === 0) {
        showToast('Configure a divisão entre os responsáveis', 'warning');
        return;
      }

      if (Math.round(totalSplitPercentage) !== 100) {
        showToast('A divisão deve somar exatamente 100%', 'warning');
        return;
      }
    }

    if (isExpense && !formData.category_id) {
      showToast('Selecione uma categoria', 'warning');
      return;
    }

    if (isCreditPayment) {
      if (!formData.card_id) {
        showToast('Selecione o cartão', 'warning');
        return;
      }
      if (!formData.installments || installmentsValue < 1) {
        showToast('Defina o número de parcelas', 'warning');
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
              {transaction ? 'Editar' : 'Nova'} {type === 'income' ? 'Entrada' : 'Despesa'}
            </Title2>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
                <Caption color="secondary" weight="medium">Descrição *</Caption>
                <Input
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, description: text }))
                  }
                  placeholder="Ex: Mercado"
                  icon={<Tag size={20} color={colors.text.secondary} />}
                />
              </View>

              {/* Amount */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Valor *</Caption>
                <Input
                  value={formData.amount}
                  onChangeText={(text) => {
                    // Permitir apenas números e vírgula/ponto
                    const cleaned = text.replace(/[^0-9,.]/g, '');
                    setFormData((prev) => ({ ...prev, amount: cleaned }));
                  }}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  icon={<Text style={styles.currencyIcon}>R$</Text>}
                />
              </View>

              {/* Date */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Data *</Caption>
                <Input
                  value={formData.date}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, date: text }))
                  }
                  placeholder="AAAA-MM-DD"
                  icon={<Calendar size={20} color={colors.text.secondary} />}
                />
              </View>

              {/* Category */}
              <SelectField
                label="Categoria"
                value={
                  selectedCategory?.name ||
                  (formData.category_id ? 'Categoria indisponível' : '')
                }
                placeholder={
                  filteredCategories.length === 0
                    ? 'Carregando categorias...'
                    : 'Selecionar categoria'
                }
                disabled={filteredCategories.length === 0}
                onPress={() =>
                  filteredCategories.length > 0 && openSheet('category')
                }
              />

              {/* Responsible */}
              <SelectField
                label="Responsável"
                value={selectedOwnerLabel}
                placeholder={
                  ownerEntries.length === 0
                    ? 'Carregando responsáveis...'
                    : 'Selecionar responsável'
                }
                disabled={ownerEntries.length === 0}
                onPress={() => ownerEntries.length > 0 && openSheet('owner')}
              />

              {formData.is_shared && (
                <View style={styles.splitSection}>
                  <View style={styles.splitHeader}>
                    <Caption color="secondary" weight="medium">
                      Divisão entre responsáveis
                    </Caption>
                    <TouchableOpacity onPress={resetSplits} disabled={!costCenters.length}>
                      <Caption
                        style={[
                          styles.resetSplits,
                          !costCenters.length && styles.resetSplitsDisabled,
                        ]}
                      >
                        Usar padrão
                      </Caption>
                    </TouchableOpacity>
                  </View>

                  {formData.splits && formData.splits.length > 0 ? (
                    formData.splits.map((split) => (
                      <View key={split.cost_center_id} style={styles.splitRow}>
                        <View style={styles.splitInfo}>
                          <Callout weight="medium">{split.name}</Callout>
                          <Caption color="secondary">
                            {formatCurrency(
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
                            style={styles.splitPercentageInput}
                          />
                          <Text style={styles.percentSuffix}>%</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Caption color="tertiary">
                      Cadastre responsáveis individuais para configurar a divisão.
                    </Caption>
                  )}

                  <Caption
                    style={[
                      styles.splitTotal,
                      Math.round(totalSplitPercentage) !== 100 && styles.splitTotalError,
                    ]}
                  >
                    Total: {totalSplitPercentage.toFixed(1).replace('.', ',')}%
                  </Caption>
                </View>
              )}

              {/* Payment Method */}
              {isExpense && (
                <SelectField
                  label="Forma de Pagamento"
                  value={paymentSelection?.label || ''}
                  placeholder="Selecionar forma de pagamento"
                  onPress={() => openSheet('payment')}
                />
              )}

              {/* Card Selector */}
              {isExpense && formData.payment_method === 'credit_card' && (
                <SelectField
                  label="Cartão"
                  value={selectedCard?.name || ''}
                  placeholder={
                    cardEntries.length === 0
                      ? 'Carregando cartões...'
                      : 'Selecionar cartão'
                  }
                  disabled={cardEntries.length === 0}
                  onPress={() =>
                    cardEntries.length > 0 && openSheet('card')
                  }
                />
              )}

              {isCreditPayment && (
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">Parcelas</Caption>
                  <Input
                    value={String(formData.installments || '')}
                    onChangeText={(text) => {
                      const sanitized = text.replace(/[^0-9]/g, '');
                      setFormData((prev) => ({ ...prev, installments: sanitized }));
                    }}
                    placeholder="1"
                    keyboardType="number-pad"
                  />
                </View>
              )}

              {/* Receipt Upload - apenas para despesas */}
              {isExpense && (
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">Comprovante</Caption>
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
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Salvar"
              variant="primary"
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>

          <OptionSheet
            visible={activeSheet === 'category'}
            title="Categorias"
            options={categoryOptions}
            selectedId={formData.category_id || null}
            onSelect={handleSelectCategoryOption}
            onClose={closeSheet}
          />

          <OptionSheet
            visible={activeSheet === 'owner'}
            title="Responsáveis"
            options={ownerEntries}
            selectedId={ownerSelectionId}
            onSelect={handleSelectOwnerOption}
            onClose={closeSheet}
          />

          <OptionSheet
            visible={activeSheet === 'payment'}
            title="Forma de Pagamento"
            options={PAYMENT_OPTIONS}
            selectedId={paymentSelection?.id || null}
            onSelect={handleSelectPaymentOption}
            onClose={closeSheet}
          />

          <OptionSheet
            visible={activeSheet === 'card'}
            title="Selecionar cartão"
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

