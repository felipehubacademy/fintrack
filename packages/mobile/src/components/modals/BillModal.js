import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X, Calendar as CalendarIcon, DollarSign, Tag, User, CreditCard, RefreshCw } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

const { height } = Dimensions.get('window');

const PAYMENT_METHODS = [
  { value: '', label: 'Selecione...' },
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'bank_transfer', label: 'Transferência' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' },
];

const RECURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

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

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
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

    const billData = {
      ...formData,
      amount: parseFloat(formData.amount),
      organization_id: organization?.id,
    };

    onSave(billData);
    onClose();
  };

  if (!visible) return null;

  const isSoloUser = organization?.type === 'solo';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} 
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
            showsVerticalScrollIndicator={false}
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
                  onChangeText={(text) => setFormData({ ...formData, amount: text.replace(/[^0-9.,]/g, '') })}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  icon={<DollarSign size={20} color={colors.text.secondary} />}
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
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">Categoria</Caption>
                  <View style={styles.selectContainer}>
                    <Tag size={20} color={colors.text.secondary} style={styles.selectIcon} />
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">Selecione uma categoria...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </View>
                </View>
              )}

              {/* Responsible (only if not solo) */}
              {!isSoloUser && costCenters.length > 0 && (
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">Responsável</Caption>
                  <View style={styles.selectContainer}>
                    <User size={20} color={colors.text.secondary} style={styles.selectIcon} />
                    <select
                      value={formData.cost_center_id}
                      onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value, is_shared: !e.target.value })}
                      style={styles.select}
                    >
                      <option value="">Compartilhado ({organization?.name || 'Família'})</option>
                      {costCenters.filter(cc => cc.is_active !== false && !cc.is_shared).map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                      ))}
                    </select>
                  </View>
                </View>
              )}

              {/* Payment Method */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Forma de Pagamento</Caption>
                <View style={styles.selectContainer}>
                  <CreditCard size={20} color={colors.text.secondary} style={styles.selectIcon} />
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    style={styles.select}
                  >
                    {PAYMENT_METHODS.map(pm => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                </View>
              </View>

              {/* Card (if credit card) */}
              {formData.payment_method === 'credit_card' && cards.length > 0 && (
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">Cartão</Caption>
                  <View style={styles.selectContainer}>
                    <CreditCard size={20} color={colors.text.secondary} style={styles.selectIcon} />
                    <select
                      value={formData.card_id}
                      onChange={(e) => setFormData({ ...formData, card_id: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">Selecione um cartão...</option>
                      {cards.map(card => (
                        <option key={card.id} value={card.id}>{card.name}</option>
                      ))}
                    </select>
                  </View>
                </View>
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
                <View style={styles.field}>
                  <Caption color="secondary" weight="medium">Frequência</Caption>
                  <View style={styles.selectContainer}>
                    <RefreshCw size={20} color={colors.text.secondary} style={styles.selectIcon} />
                    <select
                      value={formData.recurrence_frequency}
                      onChange={(e) => setFormData({ ...formData, recurrence_frequency: e.target.value })}
                      style={styles.select}
                    >
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </View>
                </View>
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
          <View style={styles.footer}>
            <Button
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleSave}
              style={{ flex: 1 }}
            >
              {bill ? 'Salvar' : 'Adicionar'}
            </Button>
          </View>
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
    flex: 1,
  },

  form: {
    padding: spacing[3],
    gap: spacing[3],
  },

  field: {
    gap: spacing[1],
  },

  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
    paddingLeft: spacing[2],
  },

  selectIcon: {
    marginRight: spacing[1.5],
  },

  select: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing[2],
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
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
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingBottom: Platform.OS === 'ios' ? spacing[4] : spacing[3],
  },
});

