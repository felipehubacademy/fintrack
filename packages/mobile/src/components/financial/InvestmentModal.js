import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useI18n } from '../../contexts/I18nContext';
import { SELECTABLE_INVESTMENT_TYPES as INVESTMENT_TYPES } from './investmentTypes';
import {
  amountDecimalSeparator,
  sanitizeAmountInput,
  formatAmountInput,
  parseAmountInput,
} from './amountInput';

const { height } = Dimensions.get('window');

const parseCurrencyInput = (value) => parseAmountInput(value);
const formatCurrencyInput = (value) => {
  const num = typeof value === 'string' ? parseCurrencyInput(value) : value;
  return num ? formatAmountInput(num) : '';
};
// Quantities can have many decimals (crypto), so only normalise the decimal comma.
const parseQuantity = (value) => {
  const parsed = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
};

export function InvestmentModal({ visible, onClose, onSave, investment = null, goals = [] }) {
  const { showToast } = useToast();
  const { t, currencySymbol } = useI18n();
  const insets = useSafeAreaInsets();
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
      newErrors.name = t('investments.form.nameRequired');
    }

    if (!formData.invested_amount) {
      newErrors.invested_amount = t('investments.form.investedRequired');
    } else {
      const amount = parseCurrencyInput(formData.invested_amount);
      if (amount <= 0) {
        newErrors.invested_amount = t('finances.form.amountPositive');
      }
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = t('investments.form.dateRequired');
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      showToast(Object.values(newErrors)[0], 'warning');
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
        quantity: formData.quantity ? parseQuantity(formData.quantity) : null,
        purchase_date: formData.purchase_date,
        goal_id: formData.goal_id || null,
        notes: formData.notes.trim() || null,
        last_updated_at: formData.current_value ? new Date().toISOString() : null
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
      showToast(t('investments.saveError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: sanitizeAmountInput(value) }));
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={[styles.overlay, { paddingTop: insets.top || spacing[4] }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.modal,
            {
              maxHeight: Math.min(height * 0.85, height - (insets.top + insets.bottom) - spacing[6]),
              paddingBottom: Math.max(insets.bottom, spacing[3]),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="bold">{investment ? t('investments.form.editTitle') : t('investments.form.newTitle')}</Title2>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={true}
            nestedScrollEnabled={true}
          >
            {/* Tipo de Investimento */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[2] }}>
                {t('investments.form.type')}
              </Caption>
              <View style={styles.typeGrid}>
                {INVESTMENT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      formData.type === type.value && { borderColor: colors.brand.primary, backgroundColor: colors.info.bg }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: formData.type === type.value }}
                    accessibilityLabel={t(`investments.types.${type.value}`)}
                  >
                    <type.Icon size={24} color={type.color} style={{ marginBottom: spacing[0.5] }} />
                    <Caption numberOfLines={2} style={{ textAlign: 'center' }}>{t(`investments.types.${type.value}`)}</Caption>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Nome/Código */}
            <View style={styles.field}>
              <Input
                label={t('investments.form.name')}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder={t('investments.form.namePlaceholder')}
                error={errors.name}
              />
            </View>

            {/* Corretora/Banco */}
            <View style={styles.field}>
              <Input
                label={t('investments.form.broker')}
                value={formData.broker}
                onChangeText={(text) => setFormData(prev => ({ ...prev, broker: text }))}
                placeholder={t('investments.form.brokerPlaceholder')}
              />
            </View>

            {/* Valor Investido & Valor Atual */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  {t('investments.form.invested')}
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>{currencySymbol()}</Caption>
                  <TextInput
                    style={[styles.amountInput, errors.invested_amount && { borderColor: colors.error.main }]}
                    value={formData.invested_amount}
                    onChangeText={(text) => handleCurrencyChange('invested_amount', text)}
                    onBlur={() => handleCurrencyBlur('invested_amount')}
                    placeholder={`0${amountDecimalSeparator()}00`}
                    accessibilityLabel={t('investments.form.invested')}
                    keyboardType="decimal-pad"
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
                  {t('investments.form.current')}
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>{currencySymbol()}</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.current_value}
                    onChangeText={(text) => handleCurrencyChange('current_value', text)}
                    onBlur={() => handleCurrencyBlur('current_value')}
                    placeholder={`0${amountDecimalSeparator()}00`}
                    accessibilityLabel={t('investments.form.current')}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Caption color="secondary" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  {t('investments.form.currentHint')}
                </Caption>
              </View>
            </View>

            {/* Quantidade & Data da Compra */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label={t('investments.form.quantity')}
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text.replace(/[^0-9.,]/g, '') }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  {t('investments.form.date')}
                </Caption>
                <Input
                  value={formData.purchase_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, purchase_date: text }))}
                  placeholder={t('finances.form.datePlaceholder')}
                  accessibilityLabel={t('investments.form.date')}
                  error={errors.purchase_date}
                />
              </View>
            </View>

            {/* Observações */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                {t('bills.form.notes')}
              </Caption>
              <TextInput
                style={styles.textArea}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder={t('investments.form.notesPlaceholder')}
                accessibilityLabel={t('bills.form.notes')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title={t('common.cancel')}
              variant="outline"
              onPress={onClose}
              disabled={isSubmitting}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title={isSubmitting ? t('investments.form.saving') : (investment ? t('common.save') : t('bills.form.add'))}
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
    paddingHorizontal: spacing[2],
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '100%',
    minHeight: height * 0.55,
    overflow: 'hidden',
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

