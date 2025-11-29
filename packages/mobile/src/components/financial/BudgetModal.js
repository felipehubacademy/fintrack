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
import { X } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

const { height } = Dimensions.get('window');

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

// Funções de formatação de moeda
const parseCurrencyInput = (value) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const formatCurrencyInput = (value) => {
  if (!value || value === 0) return '';
  const num = typeof value === 'string' ? parseCurrencyInput(value) : value;
  if (num === 0) return '';
  return num.toFixed(2).replace('.', ',');
};

// Componente SelectField
const SelectField = ({ label, value, placeholder, onPress, disabled }) => (
  <View style={selectStyles.field}>
    <Caption color="secondary" weight="medium" style={selectStyles.label}>
      {label}
    </Caption>
    <TouchableOpacity
      style={[
        selectStyles.selectField,
        disabled && selectStyles.selectFieldDisabled,
        !value && selectStyles.selectFieldEmpty,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text variant="callout" numberOfLines={1} style={!value ? selectStyles.selectPlaceholder : null}>
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  </View>
);

// Componente OptionSheet
const OptionSheet = ({ visible, onClose, title, options = [], selectedValue, onSelect }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={selectStyles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={selectStyles.sheetContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={selectStyles.sheetHeader}>
            <Title2 weight="semiBold">{title}</Title2>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={selectStyles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled={true}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  selectStyles.sheetOption,
                  selectedValue === option.id && selectStyles.sheetOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
              >
                <Text variant="callout">{option.name}</Text>
                {selectedValue === option.id && (
                  <View style={selectStyles.checkmark}>
                    <Text style={{ color: colors.brand.primary }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export function BudgetModal({
  visible,
  onClose,
  onSave,
  budget = null,
  categories = [],
  selectedMonth,
}) {
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  const [formData, setFormData] = useState({
    category_id: '',
    limit_amount: '',
  });
  const [saving, setSaving] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFormData({
        category_id: '',
        limit_amount: '',
      });
      return;
    }

    if (budget && budget.id) {
      setFormData({
        category_id: budget.category_id || '',
        limit_amount: budget.amount ? formatCurrencyInput(budget.amount) : '',
      });
    } else {
      setFormData({
        category_id: '',
        limit_amount: '',
      });
    }
  }, [budget, visible]);

  const handleSave = async () => {
    if (!formData.category_id || !formData.limit_amount) {
      showToast('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    const parsedAmount = parseCurrencyInput(formData.limit_amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Valor deve ser maior que zero', 'warning');
      return;
    }

    setSaving(true);
    try {
      const budgetData = {
        category_id: formData.category_id,
        limit_amount: parsedAmount,
      };

      if (budget && budget.id) {
        budgetData.id = budget.id;
      }

      await onSave(budgetData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      showToast('Erro ao salvar orçamento: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAmountChange = (text) => {
    const cleaned = text.replace(/[^\d,]/g, '');
    setFormData({ ...formData, limit_amount: cleaned });
  };

  const handleAmountBlur = () => {
    const parsed = parseCurrencyInput(formData.limit_amount);
    if (parsed > 0) {
      setFormData({ ...formData, limit_amount: formatCurrencyInput(parsed) });
    } else {
      setFormData({ ...formData, limit_amount: '' });
    }
  };

  const isEdit = !!(budget && budget.id);
  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modal, { marginBottom: safeBottom }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="bold">{isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}</Title2>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
          >
            {/* Categoria */}
            <View style={styles.field}>
              <SelectField
                label="Categoria *"
                value={selectedCategory?.name || ''}
                placeholder="Selecione uma categoria..."
                onPress={() => setShowCategorySheet(true)}
                disabled={isEdit}
              />
              {isEdit && (
                <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                  A categoria não pode ser alterada. Para mudar, exclua e crie um novo orçamento.
                </Caption>
              )}
            </View>

            {/* Valor */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                Valor do Orçamento (R$) *
              </Caption>
              <Input
                value={formData.limit_amount}
                onChangeText={handleAmountChange}
                onBlur={handleAmountBlur}
                placeholder="0,00"
                keyboardType="numeric"
                editable={!saving}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[
            styles.footer,
            { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }
          ]}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              disabled={saving}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title={saving ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Criar Orçamento')}
              onPress={handleSave}
              disabled={saving || !formData.category_id || !formData.limit_amount}
              style={{ flex: 1 }}
            />
          </View>

          {/* Category Options Sheet */}
          <OptionSheet
            visible={showCategorySheet}
            onClose={() => setShowCategorySheet(false)}
            title="Selecione a categoria"
            options={sortedCategories}
            selectedValue={formData.category_id}
            onSelect={(categoryId) => {
              setFormData({ ...formData, category_id: categoryId });
            }}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: height * 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
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
  field: {
    marginBottom: spacing[3],
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

const selectStyles = StyleSheet.create({
  field: {
    marginBottom: spacing[2],
  },
  label: {
    marginBottom: spacing[1],
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  selectFieldEmpty: {
    borderColor: colors.border.light,
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
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetContent: {
    maxHeight: height * 0.6,
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetOptionSelected: {
    backgroundColor: colors.brand.bg,
  },
  checkmark: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

