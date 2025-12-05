import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Switch,
  Platform,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar as CalendarIcon, DollarSign, Tag, User, CreditCard, RefreshCw, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX' },
  { id: 'credit_card', label: 'Cartão de Crédito' },
  { id: 'debit_card', label: 'Cartão de Débito' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'bank_transfer', label: 'Transferência' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'other', label: 'Outro' },
];

const RECURRENCE_OPTIONS = [
  { id: 'monthly', label: 'Mensal' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'yearly', label: 'Anual' },
];

const VALID_PAYMENT_METHODS = ['pix', 'credit_card', 'debit_card', 'boleto', 'bank_transfer', 'cash', 'other'];

// Parse currency input (handles comma and dot)
const parseCurrencyInput = (formattedValue) => {
  if (!formattedValue) return 0;
  const cleaned = formattedValue.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

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

// Componente OptionSheet (igual ao TransactionModal)
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
                const optionId = option.id;
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
 * BillModal - Modal para adicionar/editar conta a pagar
 */
export function BillModal({ 
  visible, 
  onClose, 
  onSave,
  bill = null,
  categories = [],
  costCenters = [],
  cards = [],
  organization = null,
}) {
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    category_id: '',
    cost_center_id: '',
    is_shared: false,
    is_recurring: false,
    recurrence_frequency: 'monthly',
    payment_method: '',
    card_id: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [activeSheet, setActiveSheet] = useState(null);

  useEffect(() => {
    if (bill) {
      setFormData({
        description: bill.description || '',
        amount: bill.amount?.toString() || '',
        due_date: bill.due_date || new Date().toISOString().split('T')[0],
        category_id: bill.category_id || '',
        cost_center_id: bill.cost_center_id || '',
        is_shared: bill.is_shared || false,
        is_recurring: bill.is_recurring || false,
        recurrence_frequency: bill.recurrence_frequency || 'monthly',
        payment_method: bill.payment_method || '',
        card_id: bill.card_id || '',
        notes: bill.notes || '',
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        category_id: '',
        cost_center_id: '',
        is_shared: false,
        is_recurring: false,
        recurrence_frequency: 'monthly',
        payment_method: '',
        card_id: '',
        notes: '',
      });
    }
    setErrors({});
  }, [bill, visible]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    const amountValue = parseCurrencyInput(formData.amount);
    if (!formData.amount || amountValue <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const isSoloUserLocal = organization?.type === 'solo';
    const isShared = isSoloUserLocal ? false : formData.is_shared;
    const costCenterId = isSoloUserLocal
      ? (costCenters.find(cc => cc.is_active !== false)?.id || null)
      : isShared
        ? null
        : (formData.cost_center_id || null);

    const billData = {
      description: formData.description.trim(),
      amount: parseCurrencyInput(formData.amount),
      due_date: formData.due_date,
      category_id: formData.category_id || null,
      cost_center_id: costCenterId,
      is_shared: isShared,
      is_recurring: formData.is_recurring,
      recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
      organization_id: organization?.id,
    };

    // Adicionar payment_method apenas se tiver valor válido
    if (formData.payment_method && VALID_PAYMENT_METHODS.includes(formData.payment_method)) {
      billData.payment_method = formData.payment_method;
      // Adicionar card_id apenas se for cartão de crédito
      if (formData.payment_method === 'credit_card' && formData.card_id) {
        billData.card_id = formData.card_id;
      }
    }

    // Adicionar notes se houver
    if (formData.notes?.trim()) {
      billData.notes = formData.notes.trim();
    }

    onSave(billData);
    onClose();
  };

  if (!visible) return null;

  const isSoloUser = organization?.type === 'solo';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modal, { marginBottom: safeBottom }]} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="semiBold">
              {bill ? 'Editar' : 'Nova'} Conta a Pagar
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
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Ex: Conta de Luz"
                  icon={<Tag size={20} color={colors.text.secondary} />}
                />
                {errors.description && (
                  <Caption style={{ color: colors.error.main, marginTop: spacing[0.5] }}>
                    {errors.description}
                  </Caption>
                )}
              </View>

              {/* Amount */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Valor *</Caption>
                <Input
                  value={formData.amount}
                  onChangeText={(text) => {
                    // Permitir apenas números e vírgula/ponto
                    const cleaned = text.replace(/[^0-9,.]/g, '');
                    setFormData({ ...formData, amount: cleaned });
                  }}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  icon={<Text style={styles.currencyIcon}>R$</Text>}
                />
                {errors.amount && (
                  <Caption style={{ color: colors.error.main, marginTop: spacing[0.5] }}>
                    {errors.amount}
                  </Caption>
                )}
              </View>

              {/* Due Date */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Vencimento *</Caption>
                <Input
                  value={formData.due_date}
                  onChangeText={(text) => setFormData({ ...formData, due_date: text })}
                  placeholder="YYYY-MM-DD"
                  icon={<CalendarIcon size={20} color={colors.text.secondary} />}
                />
                {errors.due_date && (
                  <Caption style={{ color: colors.error.main, marginTop: spacing[0.5] }}>
                    {errors.due_date}
                  </Caption>
                )}
              </View>

              {/* Category */}
              {categories.length > 0 && (
                <SelectField
                  label="Categoria"
                  value={categories.find(c => c.id === formData.category_id)?.name || ''}
                  placeholder="Selecionar categoria"
                  disabled={categories.length === 0}
                  onPress={() => categories.length > 0 && setActiveSheet('category')}
                />
              )}

              {/* Responsible (only if not solo) */}
              {!isSoloUser && costCenters.length > 0 && (
                <SelectField
                  label="Responsável"
                  value={formData.cost_center_id 
                    ? costCenters.find(cc => cc.id === formData.cost_center_id)?.name || ''
                    : `Compartilhado (${organization?.name || 'Família'})`
                  }
                  placeholder="Selecionar responsável"
                  disabled={costCenters.length === 0}
                  onPress={() => costCenters.length > 0 && setActiveSheet('cost_center')}
                />
              )}

              {/* Payment Method */}
              <SelectField
                label="Forma de Pagamento"
                value={PAYMENT_METHODS.find(pm => pm.id === formData.payment_method)?.label || ''}
                placeholder="Selecionar forma de pagamento"
                onPress={() => setActiveSheet('payment_method')}
              />

              {/* Card (if credit card) */}
              {formData.payment_method === 'credit_card' && cards.length > 0 && (
                <SelectField
                  label="Cartão"
                  value={cards.find(c => c.id === formData.card_id)?.name || ''}
                  placeholder="Selecionar cartão"
                  disabled={cards.length === 0}
                  onPress={() => cards.length > 0 && setActiveSheet('card')}
                />
              )}

              {/* Recurring */}
              <View style={styles.field}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Callout weight="medium">Conta Recorrente</Callout>
                    <Caption color="secondary">Repetir todos os meses</Caption>
                  </View>
                  <Switch
                    value={formData.is_recurring}
                    onValueChange={(value) => setFormData({ ...formData, is_recurring: value })}
                    trackColor={{ false: colors.neutral[300], true: colors.brand.primary }}
                    thumbColor={colors.neutral[0]}
                  />
                </View>
              </View>

              {/* Recurrence Frequency */}
              {formData.is_recurring && (
                <SelectField
                  label="Frequência"
                  value={RECURRENCE_OPTIONS.find(opt => opt.id === formData.recurrence_frequency)?.label || ''}
                  placeholder="Selecionar frequência"
                  onPress={() => setActiveSheet('recurrence_frequency')}
                />
              )}

              {/* Notes */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Observações</Caption>
                <Input
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Observações adicionais..."
                  multiline
                  numberOfLines={3}
                  style={{ height: 80, textAlignVertical: 'top' }}
                />
              </View>
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
              title={bill ? 'Salvar' : 'Adicionar'}
              variant="primary"
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Option Sheets */}
      <OptionSheet
        visible={activeSheet === 'category'}
        title="Selecione a Categoria"
        options={categories.map(cat => ({ id: cat.id, label: cat.name }))}
        selectedId={formData.category_id}
        onSelect={(option) => setFormData({ ...formData, category_id: option.id })}
        onClose={() => setActiveSheet(null)}
      />

      <OptionSheet
        visible={activeSheet === 'cost_center'}
        title="Selecione o Responsável"
        options={[
          { id: '', label: `Compartilhado (${organization?.name || 'Família'})` },
          ...costCenters.filter(cc => cc.is_active !== false && !cc.is_shared).map(cc => ({ id: cc.id, label: cc.name }))
        ]}
        selectedId={formData.cost_center_id}
        onSelect={(option) => setFormData({ ...formData, cost_center_id: option.id, is_shared: !option.id })}
        onClose={() => setActiveSheet(null)}
      />

      <OptionSheet
        visible={activeSheet === 'payment_method'}
        title="Selecione a Forma de Pagamento"
        options={PAYMENT_METHODS}
        selectedId={formData.payment_method}
        onSelect={(option) => setFormData({ ...formData, payment_method: option.id, card_id: option.id !== 'credit_card' ? '' : formData.card_id })}
        onClose={() => setActiveSheet(null)}
      />

      <OptionSheet
        visible={activeSheet === 'card'}
        title="Selecione o Cartão"
        options={cards.map(card => ({ id: card.id, label: card.name }))}
        selectedId={formData.card_id}
        onSelect={(option) => setFormData({ ...formData, card_id: option.id })}
        onClose={() => setActiveSheet(null)}
      />

      <OptionSheet
        visible={activeSheet === 'recurrence_frequency'}
        title="Selecione a Frequência"
        options={RECURRENCE_OPTIONS}
        selectedId={formData.recurrence_frequency}
        onSelect={(option) => setFormData({ ...formData, recurrence_frequency: option.id })}
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
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
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
    paddingVertical: spacing[2],
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

  currencyIcon: {
    fontWeight: '600',
    color: colors.text.primary,
    fontSize: 16,
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

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
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

