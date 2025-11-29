import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView as RNScrollView,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Callout, Caption, Title2 } from '../ui/Text';
import { Button } from '../ui/Button';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

const paymentMethodLabels = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  pix: 'PIX',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
};

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApplyFilters,
  costCenters = [],
  categories = [],
  paymentMethods = [],
  cards = [],
  organizationName = 'Organização',
}) {
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  const [localFilters, setLocalFilters] = useState({
    costCenter: filters?.costCenter || null,
    category: filters?.category || null,
    paymentMethod: filters?.paymentMethod || null,
    card: filters?.card || null,
    type: filters?.type || 'all', // all, expense, income
  });

  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    setLocalFilters({
      costCenter: filters?.costCenter || null,
      category: filters?.category || null,
      paymentMethod: filters?.paymentMethod || null,
      card: filters?.card || null,
      type: filters?.type || 'all',
    });
  }, [filters]);

  const typeFilter = localFilters.type || 'all';

  const filteredCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    if (typeFilter === 'all') return categories;
    return categories.filter((category) => {
      if (!category?.type) return true;
      if (category.type === 'both') return true;
      return category.type === typeFilter;
    });
  }, [categories, typeFilter]);

  const responsibleOptions = useMemo(() => {
    const activeCostCenters = (costCenters || []).filter(
      (cc) => cc?.is_active !== false
    );
    const orgOption = {
      value: 'organization',
      label: organizationName || 'Organização',
    };
    return [
      { value: null, label: 'Todos os responsáveis' },
      orgOption,
      ...activeCostCenters.map((cc) => ({
        value: cc.id,
        label: cc.name || 'Sem nome',
      })),
    ];
  }, [costCenters, organizationName]);

  const categoryOptions = useMemo(
    () => [
      { value: null, label: 'Todas as categorias' },
      ...filteredCategories.map((cat) => ({
        value: cat.id,
        label: cat.name || 'Sem categoria',
      })),
    ],
    [filteredCategories]
  );

  const paymentMethodOptions = useMemo(() => {
    const methods =
      paymentMethods && paymentMethods.length > 0
        ? paymentMethods
        : Object.keys(paymentMethodLabels);

    return [
      { value: null, label: 'Todas as formas' },
      ...methods.map((method) => ({
        value: method,
        label: paymentMethodLabels[method] || method,
      })),
    ];
  }, [paymentMethods]);

  const cardOptions = useMemo(() => {
    const activeCards = (cards || []).filter((card) => card?.is_active !== false);
    return [
      { value: null, label: 'Todos os cartões' },
      ...activeCards.map((card) => ({
        value: card.id,
        label: card.name || 'Cartão',
      })),
    ];
  }, [cards]);

  useEffect(() => {
    if (
      localFilters.paymentMethod !== 'credit_card' &&
      localFilters.card !== null
    ) {
      setLocalFilters((prev) => ({ ...prev, card: null }));
    }
  }, [localFilters.paymentMethod, localFilters.card]);

  useEffect(() => {
    if (!localFilters.category) return;
    const exists = filteredCategories.some(
      (cat) => cat.id === localFilters.category
    );
    if (!exists) {
      setLocalFilters((prev) => ({ ...prev, category: null }));
    }
  }, [filteredCategories, localFilters.category]);

  const responsibleLabel = useMemo(() => {
    if (localFilters.costCenter === 'organization') {
      return organizationName || 'Organização';
    }
    if (localFilters.costCenter === null || localFilters.costCenter === undefined) {
      return null;
    }
    const selected = (costCenters || []).find(
      (cc) => cc.id === localFilters.costCenter
    );
    return selected?.name || null;
  }, [localFilters.costCenter, costCenters, organizationName]);

  const categoryLabel = useMemo(() => {
    if (!localFilters.category) return null;
    const fromFiltered = filteredCategories.find(
      (cat) => cat.id === localFilters.category
    );
    if (fromFiltered) return fromFiltered.name || null;
    const fallback = (categories || []).find(
      (cat) => cat.id === localFilters.category
    );
    return fallback?.name || null;
  }, [localFilters.category, filteredCategories, categories]);

  const paymentLabel = useMemo(() => {
    if (!localFilters.paymentMethod) return null;
    return (
      paymentMethodLabels[localFilters.paymentMethod] ||
      localFilters.paymentMethod ||
      null
    );
  }, [localFilters.paymentMethod]);

  const cardLabel = useMemo(() => {
    if (!localFilters.card) return null;
    const selected = (cards || []).find((card) => card.id === localFilters.card);
    return selected?.name || null;
  }, [localFilters.card, cards]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = {
      costCenter: null,
      category: null,
      paymentMethod: null,
      card: null,
      type: 'all',
    };
    setLocalFilters(clearedFilters);
    onApplyFilters(clearedFilters);
    onClose();
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

  const FilterSection = ({ title, options = [], selectedValue, onSelect, keyField = 'id', labelField = 'name' }) => {
    return (
      <View style={styles.field}>
        <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>{title}</Caption>
        {options.length === 0 ? (
          <Caption color="tertiary">Nenhuma opção disponível</Caption>
        ) : (
          <View style={styles.selectorContainer}>
            {options.map((option) => {
              const key = typeof option === 'string' ? option : option[keyField];
              const label = typeof option === 'string' ? option : option[labelField];
              const isSelected = selectedValue === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                  onPress={() => onSelect(isSelected ? null : key)}
                >
                  <Callout weight={isSelected ? 'semiBold' : 'regular'} style={{ color: isSelected ? colors.neutral[0] : colors.text.primary }}>
                    {label || '—'}
                  </Callout>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };


const OptionSheet = ({
  visible,
  title,
  options = [],
  selectedValue,
  onSelect,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity 
          activeOpacity={1} 
          style={[styles.sheetContainer, { marginBottom: safeBottom, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }]} 
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHandle} />
          <Title2 weight="semiBold" style={styles.sheetTitle}>
            {title}
          </Title2>

          <ScrollView
            style={{ maxHeight: height * 0.5 }}
            showsVerticalScrollIndicator={false}
            {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
            scrollEnabled={true}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {options.length === 0 ? (
              <Caption color="secondary" style={{ textAlign: 'center', marginBottom: spacing[2] }}>
                Nenhuma opção disponível
              </Caption>
            ) : (
              options.map((option) => {
                const optionValue = option.value ?? null;
                const isSelected =
                  optionValue === null
                    ? selectedValue === null || selectedValue === undefined
                    : selectedValue === optionValue;

                return (
                  <TouchableOpacity
                    key={`option-${String(optionValue)}`}
                    style={[
                      styles.sheetOption,
                      isSelected && styles.sheetOptionSelected,
                    ]}
                    onPress={() => {
                      onSelect(optionValue);
                      onClose();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Callout weight="medium">{option.label}</Callout>
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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modal, { marginBottom: safeBottom }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="semiBold">Filtros</Title2>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
            scrollEnabled={true}
          >
            <View style={styles.form}>
              {/* Tipo */}
              <FilterSection
                title="Tipo de transação"
                options={[
                  { id: 'all', name: 'Todas' },
                  { id: 'expense', name: 'Despesas' },
                  { id: 'income', name: 'Entradas' },
                ]}
                selectedValue={localFilters.type}
                onSelect={(value) => setLocalFilters({ ...localFilters, type: value || 'all' })}
              />

              <SelectField
                label="Responsável"
                value={responsibleLabel}
                placeholder="Selecionar responsável"
                onPress={() => setActiveDropdown('responsible')}
              />

              <SelectField
                label="Categoria"
                value={categoryLabel}
                placeholder="Selecionar categoria"
                onPress={() => setActiveDropdown('category')}
              />

              {typeFilter !== 'income' && (
                <SelectField
                  label="Forma de pagamento"
                  value={paymentLabel}
                  placeholder="Selecionar forma de pagamento"
                  onPress={() => setActiveDropdown('payment')}
                />
              )}

              {typeFilter !== 'income' && localFilters.paymentMethod === 'credit_card' && (
                <SelectField
                  label="Cartão"
                  value={cardLabel}
                  placeholder="Selecionar cartão"
                  onPress={() => setActiveDropdown('card')}
                />
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[3]) : spacing[3] }]}>
            <Button
              title="Limpar Filtros"
              variant="outline"
              onPress={handleClear}
              style={{ flex: 1 }}
            />
            <Button
              title="Aplicar Filtros"
              variant="primary"
              onPress={handleApply}
              style={{ flex: 1 }}
            />
          </View>

          <OptionSheet
            visible={activeDropdown === 'responsible'}
            title="Responsáveis"
            options={responsibleOptions}
            selectedValue={localFilters.costCenter}
            onSelect={(value) =>
              setLocalFilters((prev) => ({ ...prev, costCenter: value ?? null }))
            }
            onClose={() => setActiveDropdown(null)}
          />
          <OptionSheet
            visible={activeDropdown === 'category'}
            title="Categorias"
            options={categoryOptions}
            selectedValue={localFilters.category}
            onSelect={(value) =>
              setLocalFilters((prev) => ({ ...prev, category: value ?? null }))
            }
            onClose={() => setActiveDropdown(null)}
          />
          <OptionSheet
            visible={activeDropdown === 'payment'}
            title="Formas de Pagamento"
            options={paymentMethodOptions}
            selectedValue={localFilters.paymentMethod}
            onSelect={(value) =>
              setLocalFilters((prev) => ({
                ...prev,
                paymentMethod: value ?? null,
              }))
            }
            onClose={() => setActiveDropdown(null)}
          />
          <OptionSheet
            visible={activeDropdown === 'card'}
            title="Cartões"
            options={cardOptions}
            selectedValue={localFilters.card}
            onSelect={(value) =>
              setLocalFilters((prev) => ({ ...prev, card: value ?? null }))
            }
            onClose={() => setActiveDropdown(null)}
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
    paddingTop: spacing[2],
    // paddingBottom será aplicado dinamicamente com safe area
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

