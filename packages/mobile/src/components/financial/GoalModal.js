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
import { X, PiggyBank, CreditCard, ShoppingBag, TrendingUp, Wallet } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

const { height } = Dimensions.get('window');

const GOAL_TYPES = {
  emergency_fund: {
    label: 'Reserva de Emergência',
    icon: PiggyBank,
    color: '#10B981',
    description: '3-6 meses de despesas',
    suggestedAmount: 20000
  },
  debt_payment: {
    label: 'Quitação de Dívida',
    icon: CreditCard,
    color: '#EF4444',
    description: 'Elimine dívidas',
    suggestedAmount: 5000
  },
  purchase: {
    label: 'Compra Planejada',
    icon: ShoppingBag,
    color: '#8B5CF6',
    description: 'Carro, casa, viagem',
    suggestedAmount: 50000
  },
  investment: {
    label: 'Investimento',
    icon: TrendingUp,
    color: '#3B82F6',
    description: 'Construa patrimônio',
    suggestedAmount: 100000
  },
  savings: {
    label: 'Poupança Geral',
    icon: Wallet,
    color: '#F59E0B',
    description: 'Meta livre',
    suggestedAmount: 10000
  }
};

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

export function GoalModal({ visible, onClose, onSave, editingGoal = null }) {
  const { showToast } = useToast();
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
        target_amount: editingGoal.target_amount?.toString() || '',
        current_amount: editingGoal.current_amount?.toString() || '0',
        monthly_contribution: editingGoal.monthly_contribution?.toString() || '',
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
      showToast('Preencha todos os campos obrigatórios', 'warning');
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
      showToast('Erro ao salvar meta: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      goal_type: type,
      target_amount: prev.target_amount || GOAL_TYPES[type].suggestedAmount.toString()
    }));
  };

  const handleAmountChange = (field, text) => {
    const cleaned = text.replace(/[^\d,]/g, '');
    setFormData(prev => ({ ...prev, [field]: cleaned }));
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

  const selectedType = GOAL_TYPES[formData.goal_type];
  const GoalIcon = selectedType.icon;
  const remaining = parseCurrencyInput(formData.target_amount) - parseCurrencyInput(formData.current_amount);
  const monthlyContribution = parseCurrencyInput(formData.monthly_contribution);
  const estimatedMonths = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : 0;

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
            <Title2 weight="bold">{editingGoal ? 'Editar Meta' : 'Nova Meta Financeira'}</Title2>
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
            {/* Goal Type Selection */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[2] }}>
                Tipo de Meta
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
                        isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.bg }
                      ]}
                      onPress={() => handleTypeChange(key)}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                        <Icon size={20} color={type.color} />
                      </View>
                      <Caption style={{ marginTop: spacing[0.5], textAlign: 'center' }} numberOfLines={2}>
                        {type.label}
                      </Caption>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Caption color="secondary" style={{ marginTop: spacing[1] }}>
                {selectedType.description}
              </Caption>
            </View>

            {/* Goal Name */}
            <View style={styles.field}>
              <Input
                label="Nome da Meta *"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Ex: Reserva de emergência, Viagem para Europa, etc."
              />
            </View>

            {/* Target Amount & Current Amount */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Valor Alvo (R$) *
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>R$</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.target_amount}
                    onChangeText={(text) => handleAmountChange('target_amount', text)}
                    onBlur={() => handleAmountBlur('target_amount')}
                    placeholder="0,00"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Valor Atual (R$)
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>R$</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.current_amount}
                    onChangeText={(text) => handleAmountChange('current_amount', text)}
                    onBlur={() => handleAmountBlur('current_amount')}
                    placeholder="0,00"
                    keyboardType="numeric"
                  />
                </View>
                <Caption color="secondary" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  Quanto você já tem economizado?
                </Caption>
              </View>
            </View>

            {/* Monthly Contribution & Target Date */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Contribuição Mensal (R$)
                </Caption>
                <View style={styles.currencyInput}>
                  <Caption style={{ marginRight: spacing[1] }}>R$</Caption>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.monthly_contribution}
                    onChangeText={(text) => handleAmountChange('monthly_contribution', text)}
                    onBlur={() => handleAmountBlur('monthly_contribution')}
                    placeholder="0,00"
                    keyboardType="numeric"
                  />
                </View>
                <Caption color="secondary" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  Quanto pretende guardar por mês?
                </Caption>
              </View>

              <View style={styles.halfField}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Data Alvo (opcional)
                </Caption>
                <Input
                  value={formData.target_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, target_date: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                Descrição (opcional)
              </Caption>
              <TextInput
                style={styles.textArea}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Adicione detalhes sobre sua meta..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Projection Preview */}
            {formData.target_amount && formData.monthly_contribution && monthlyContribution > 0 && (
              <View style={styles.projectionCard}>
                <Callout weight="semiBold" style={{ marginBottom: spacing[1] }}>📊 Projeção</Callout>
                <View style={styles.projectionRow}>
                  <Caption color="secondary">Falta economizar:</Caption>
                  <Callout weight="bold">{formatCurrencyInput(remaining)}</Callout>
                </View>
                <View style={styles.projectionRow}>
                  <Caption color="secondary">Tempo estimado:</Caption>
                  <Callout weight="bold">{estimatedMonths} meses</Callout>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              disabled={saving}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title={saving ? 'Salvando...' : (editingGoal ? 'Salvar Alterações' : 'Criar Meta')}
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

