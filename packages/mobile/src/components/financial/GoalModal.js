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
import { X, PiggyBank, CreditCard, ShoppingBag, TrendingUp, Wallet, BarChart3 } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useI18n } from '../../contexts/I18nContext';
import {
  amountDecimalSeparator,
  sanitizeAmountInput,
  formatAmountInput,
  parseAmountInput,
} from './amountInput';

const { height } = Dimensions.get('window');

const GOAL_TYPES = {
  emergency_fund: {
    icon: PiggyBank,
    color: '#10B981',
    suggestedAmount: 20000
  },
  debt_payment: {
    icon: CreditCard,
    color: '#EF4444',
    suggestedAmount: 5000
  },
  purchase: {
    icon: ShoppingBag,
    color: '#8B5CF6',
    suggestedAmount: 50000
  },
  investment: {
    icon: TrendingUp,
    color: '#3B82F6',
    suggestedAmount: 100000
  },
  savings: {
    icon: Wallet,
    color: '#F59E0B',
    suggestedAmount: 10000
  }
};

const parseCurrencyInput = (value) => parseAmountInput(value);
const formatCurrencyInput = (value) => {
  const num = typeof value === 'string' ? parseCurrencyInput(value) : value;
  return num ? formatAmountInput(num) : '';
};

export function GoalModal({ visible, onClose, onSave, editingGoal = null }) {
  const { showToast } = useToast();
  const { t, formatMoney, currencySymbol } = useI18n();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    name: '',
    goal_type: 'savings',
    target_amount: '',
    current_amount: '0',
    monthly_contribution: '',
    target_date: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingGoal && visible) {
      setFormData({
        name: editingGoal.name || '',
        goal_type: editingGoal.goal_type || 'savings',
        target_amount: formatCurrencyInput(Number(editingGoal.target_amount) || 0),
        current_amount: formatCurrencyInput(Number(editingGoal.current_amount) || 0) || '0',
        monthly_contribution: formatCurrencyInput(Number(editingGoal.monthly_contribution) || 0),
        target_date: editingGoal.target_date || '',
        description: editingGoal.description || ''
      });
    } else if (visible) {
      setFormData({
        name: '',
        goal_type: 'savings',
        target_amount: '',
        current_amount: '0',
        monthly_contribution: '',
        target_date: '',
        description: ''
      });
    }
  }, [editingGoal, visible]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.target_amount) {
      showToast(t('finances.form.fillRequired'), 'warning');
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        ...formData,
        target_amount: parseCurrencyInput(formData.target_amount) || 0,
        current_amount: parseCurrencyInput(formData.current_amount) || 0,
        monthly_contribution: parseCurrencyInput(formData.monthly_contribution) || 0,
        target_date: formData.target_date || null
      };

      await onSave(goalData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      showToast(t('finances.goal.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      goal_type: type,
      target_amount: prev.target_amount || formatCurrencyInput(GOAL_TYPES[type].suggestedAmount)
    }));
  };

  const handleAmountChange = (field, text) => {
    setFormData(prev => ({ ...prev, [field]: sanitizeAmountInput(text) }));
  };

  const handleAmountBlur = (field) => {
    const parsed = parseCurrencyInput(formData[field]);
    if (parsed > 0) {
      setFormData(prev => ({ ...prev, [field]: formatCurrencyInput(parsed) }));
    } else if (field !== 'current_amount') {
      setFormData(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!visible) return null;

  const selectedType = GOAL_TYPES[formData.goal_type] || GOAL_TYPES.savings;
  const GoalIcon = selectedType.icon;
  const remaining = parseCurrencyInput(formData.target_amount) - parseCurrencyInput(formData.current_amount);
  const monthlyContribution = parseCurrencyInput(formData.monthly_contribution);
  const estimatedMonths = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : 0;

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
            <Title2 weight="bold">{editingGoal ? t('finances.goal.editTitle') : t('finances.goal.newTitle')}</Title2>
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
            {/* Goal Type Selection */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[2] }}>
                {t('finances.goal.type')}
              </Caption>
              <View style={styles.typeGrid}>
                {Object.entries(GOAL_TYPES).map(([key, type]) => {
                  const Icon = type.icon;
                  const isSelected = formData.goal_type === key;
                  
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.typeButton,
                        isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.info.bg }
                      ]}
                      onPress={() => handleTypeChange(key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                        <Icon size={20} color={type.color} />
                      </View>
                      <Caption style={{ marginTop: spacing[0.5], textAlign: 'center' }} numberOfLines={2}>
                        {t(`finances.goal.types.${key}.label`)}
                      </Caption>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Caption color="secondary" style={{ marginTop: spacing[1] }}>
                {t(`finances.goal.types.${formData.goal_type in GOAL_TYPES ? formData.goal_type : 'savings'}.description`)}
              </Caption>
            </View>

            {/* Goal Name */}
            <View style={styles.field}>
              <Input
                label={t('finances.goal.name')}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder={t('finances.goal.namePlaceholder')}
              />
            </View>

            {/* Target Amount & Current Amount */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  {t('finances.goal.target')}
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>{currencySymbol()}</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.target_amount}
                    onChangeText={(text) => handleAmountChange('target_amount', text)}
                    onBlur={() => handleAmountBlur('target_amount')}
                    placeholder={`0${amountDecimalSeparator()}00`}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  {t('finances.goal.current')}
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>{currencySymbol()}</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.current_amount}
                    onChangeText={(text) => handleAmountChange('current_amount', text)}
                    onBlur={() => handleAmountBlur('current_amount')}
                    placeholder={`0${amountDecimalSeparator()}00`}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Caption color="secondary" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  {t('finances.goal.currentHint')}
                </Caption>
              </View>
            </View>

            {/* Monthly Contribution & Target Date */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  {t('finances.goal.monthly')}
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>{currencySymbol()}</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.monthly_contribution}
                    onChangeText={(text) => handleAmountChange('monthly_contribution', text)}
                    onBlur={() => handleAmountBlur('monthly_contribution')}
                    placeholder={`0${amountDecimalSeparator()}00`}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Caption color="secondary" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  {t('finances.goal.monthlyHint')}
                </Caption>
              </View>

              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  {t('finances.goal.targetDate')}
                </Caption>
                <Input
                  value={formData.target_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, target_date: text }))}
                  placeholder={t('finances.form.datePlaceholder')}
                  accessibilityLabel={t('finances.goal.targetDate')}
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                {t('finances.form.descriptionOptional')}
              </Caption>
              <TextInput
                style={styles.textArea}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder={t('finances.goal.descriptionPlaceholder')}
                accessibilityLabel={t('finances.form.descriptionOptional')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Projection Preview */}
            {formData.target_amount && formData.monthly_contribution && monthlyContribution > 0 && (
              <View style={styles.projectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing[1] }}><BarChart3 size={16} color="#1A6AFF" /><Callout weight="semiBold">{t('finances.goal.projection')}</Callout></View>
                <View style={styles.projectionRow}>
                  <Caption color="secondary">{t('finances.goal.remaining')}</Caption>
                  <Callout weight="bold">{formatMoney(Math.max(remaining, 0))}</Callout>
                </View>
                <View style={styles.projectionRow}>
                  <Caption color="secondary">{t('finances.goal.estimatedTime')}</Caption>
                  <Callout weight="bold">{t('finances.goal.months', { count: estimatedMonths })}</Callout>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title={t('common.cancel')}
              variant="outline"
              onPress={onClose}
              disabled={saving}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title={saving ? t('investments.form.saving') : (editingGoal ? t('common.save') : t('finances.goal.create'))}
              onPress={handleSubmit}
              disabled={saving || !formData.name || !formData.target_amount}
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
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
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
  projectionCard: {
    backgroundColor: colors.info.bg,
    borderRadius: radius.md,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.info.main,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

