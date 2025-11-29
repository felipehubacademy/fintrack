import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

const { height } = Dimensions.get('window');

const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Ações', icon: '📈' },
  { value: 'funds', label: 'Fundos', icon: '💼' },
  { value: 'treasury', label: 'Tesouro Direto', icon: '🏛️' },
  { value: 'fixed_income', label: 'Renda Fixa', icon: '📊' },
  { value: 'crypto', label: 'Criptomoedas', icon: '₿' },
  { value: 'other', label: 'Outros', icon: '💰' }
];

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

export function InvestmentModal({ visible, onClose, onSave, investment = null, goals = [] }) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: 'stocks',
    broker: '',
    invested_amount: '',
    current_value: '',
    quantity: '',
    purchase_date: new Date().toISOString().split('T')[0],
    goal_id: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (investment && visible) {
      setFormData({
        name: investment.name || '',
        type: investment.type || 'stocks',
        broker: investment.broker || '',
        invested_amount: investment.invested_amount ? formatCurrencyInput(investment.invested_amount) : '',
        current_value: investment.current_value ? formatCurrencyInput(investment.current_value) : '',
        quantity: investment.quantity?.toString() || '',
        purchase_date: investment.purchase_date || new Date().toISOString().split('T')[0],
        goal_id: investment.goal_id || '',
        notes: investment.notes || ''
      });
    } else if (visible) {
      setFormData({
        name: '',
        type: 'stocks',
        broker: '',
        invested_amount: '',
        current_value: '',
        quantity: '',
        purchase_date: new Date().toISOString().split('T')[0],
        goal_id: '',
        notes: ''
      });
    }
    setErrors({});
  }, [investment, visible]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome/Código é obrigatório';
    }

    if (!formData.invested_amount) {
      newErrors.invested_amount = 'Valor investido é obrigatório';
    } else {
      const amount = parseCurrencyInput(formData.invested_amount);
      if (amount <= 0) {
        newErrors.invested_amount = 'Valor deve ser maior que zero';
      }
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = 'Data da compra é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      const firstError = Object.values(errors)[0];
      showToast(firstError, 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        broker: formData.broker.trim() || null,
        invested_amount: parseCurrencyInput(formData.invested_amount),
        current_value: formData.current_value ? parseCurrencyInput(formData.current_value) : null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        purchase_date: formData.purchase_date,
        goal_id: formData.goal_id || null,
        notes: formData.notes.trim() || null,
        last_updated_at: formData.current_value ? new Date().toISOString() : null
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
      showToast('Erro ao salvar investimento: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyChange = (field, value) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    setFormData(prev => ({ ...prev, [field]: cleaned }));
  };

  const handleCurrencyBlur = (field) => {
    const value = formData[field];
    if (value) {
      const parsed = parseCurrencyInput(value);
      setFormData(prev => ({ ...prev, [field]: formatCurrencyInput(parsed) }));
    }
  };

  if (!visible) return null;

  const isFormValid = formData.name.trim() && formData.invested_amount && formData.purchase_date;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="bold">{investment ? 'Editar Investimento' : 'Novo Investimento'}</Title2>
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
          >
            {/* Tipo de Investimento */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[2] }}>
                Tipo de Investimento *
              </Caption>
              <View style={styles.typeGrid}>
                {INVESTMENT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      formData.type === type.value && { borderColor: colors.brand.primary, backgroundColor: colors.brand.bg }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  >
                    <Text style={{ fontSize: 24, marginBottom: spacing[0.5] }}>{type.icon}</Text>
                    <Caption numberOfLines={2} style={{ textAlign: 'center' }}>{type.label}</Caption>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Nome/Código */}
            <View style={styles.field}>
              <Input
                label="Nome/Código do Investimento *"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Ex: PETR4, Tesouro Selic 2027, Bitcoin"
                error={errors.name}
              />
            </View>

            {/* Corretora/Banco */}
            <View style={styles.field}>
              <Input
                label="Corretora/Banco"
                value={formData.broker}
                onChangeText={(text) => setFormData(prev => ({ ...prev, broker: text }))}
                placeholder="Ex: XP Investimentos, Nubank, Rico"
              />
            </View>

            {/* Valor Investido & Valor Atual */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Valor Investido (R$) *
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>R$</Caption>
                  <TextInput
                    style={[styles.amountInput, errors.invested_amount && { borderColor: colors.error.main }]}
                    value={formData.invested_amount}
                    onChangeText={(text) => handleCurrencyChange('invested_amount', text)}
                    onBlur={() => handleCurrencyBlur('invested_amount')}
                    placeholder="0,00"
                    keyboardType="numeric"
                  />
                </View>
                {errors.invested_amount && (
                  <Caption color="error" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                    {errors.invested_amount}
                  </Caption>
                )}
              </View>

              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Valor Atual (R$)
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>R$</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.current_value}
                    onChangeText={(text) => handleCurrencyChange('current_value', text)}
                    onBlur={() => handleCurrencyBlur('current_value')}
                    placeholder="0,00"
                    keyboardType="numeric"
                  />
                </View>
                <Caption color="secondary" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  Deixe em branco se não souber
                </Caption>
              </View>
            </View>

            {/* Quantidade & Data da Compra */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Quantidade (cotas/ações)"
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text.replace(/[^0-9.,]/g, '') }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Data da Compra *
                </Caption>
                <Input
                  value={formData.purchase_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, purchase_date: text }))}
                  placeholder="YYYY-MM-DD"
                  error={errors.purchase_date}
                />
              </View>
            </View>

            {/* Observações */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                Observações
              </Caption>
              <TextInput
                style={styles.textArea}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Notas adicionais sobre este investimento..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              disabled={isSubmitting}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title={isSubmitting ? 'Salvando...' : (investment ? 'Atualizar' : 'Adicionar')}
              onPress={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              style={{ flex: 1 }}
            />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: height * 0.9,
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
  row: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  halfField: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeButton: {
    width: '30%',
    padding: spacing[2],
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  textArea: {
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 80,
    fontSize: 14,
    color: colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

