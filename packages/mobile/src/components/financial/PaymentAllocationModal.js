import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption, Subheadline } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../services/supabase';
import { useToast } from '../ui/Toast';

const { width, height } = Dimensions.get('window');

// Componente SelectField
const SelectField = ({ label, value, placeholder, onPress, disabled }) => (
  <View>
    <Caption weight="medium" style={{ marginBottom: spacing[1] }}>
      {label}
    </Caption>
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.selectField,
        disabled && styles.selectFieldDisabled
      ]}
    >
      <Callout style={{ flex: 1, color: value ? colors.text.primary : colors.text.tertiary }}>
        {value || placeholder}
      </Callout>
      <Caption color="secondary">▼</Caption>
    </TouchableOpacity>
  </View>
);

// Componente OptionSheet
const OptionSheet = ({ visible, onClose, options, onSelect, title }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Subheadline weight="semiBold">{title}</Subheadline>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetContent}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.id ?? option.value}
                style={styles.sheetOption}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Callout>{option.label || option.name || option.value}</Callout>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
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

const processCurrencyInput = (value) => {
  if (!value) return '';
  let cleaned = value.replace(/[^0-9,.]/g, '');
  cleaned = cleaned.replace(/\./g, '');
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + ',' + parts[1].substring(0, 2);
  }
  return cleaned;
};

const formatCurrencyInput = (value) => {
  if (!value || value === 0) return '';
  const num = typeof value === 'string' ? parseAmountValue(value) : value;
  if (num === 0) return '';
  return num.toFixed(2).replace('.', ',');
};

const getBrazilTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PaymentAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  organization,
  costCenters = [],
  currentUser
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  
  const [form, setForm] = useState({
    amount: '',
    date: getBrazilTodayString(),
    description: '',
    owner_name: '',
    ownership_type: 'member',
    cost_center_id: '',
    allocation_target: 'individual',
    bank_account_id: ''
  });

  const [splitDetails, setSplitDetails] = useState([]);

  useEffect(() => {
    if (isOpen && organization?.id) {
      fetchBankAccounts();
      const userCostCenter = costCenters.find(cc => cc.user_id === currentUser?.id && cc.is_active !== false);
      
      setForm({
        amount: '',
        date: getBrazilTodayString(),
        description: '',
        owner_name: userCostCenter?.name || '',
        ownership_type: 'member',
        cost_center_id: userCostCenter?.id || '',
        allocation_target: 'individual',
        bank_account_id: ''
      });
      
      initializeSplits();
    }
  }, [isOpen, costCenters, currentUser, organization]);

  const initializeSplits = () => {
    const activeIndividualCenters = costCenters.filter(cc => !cc.is_shared && cc.is_active !== false);
    
    const splits = activeIndividualCenters.map(cc => ({
      cost_center_id: cc.id,
      cost_center_name: cc.name,
      percentage: parseFloat(cc.default_split_percentage || 0),
      amount: 0
    }));
    
    setSplitDetails(splits);
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setBankAccounts(data);
      }
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    }
  };

  const ownerOptions = useMemo(() => {
    const allCenters = (costCenters || [])
      .filter((cc) => !cc.is_shared && cc.is_active !== false)
      .map((cc) => ({
        id: cc.id,
        name: cc.name,
        type: 'member',
        cost_center_id: cc.id
      }));

    allCenters.push({
      id: null,
      name: organization?.name || 'Organização',
      type: 'organization',
      cost_center_id: null
    });

    return allCenters;
  }, [costCenters, organization]);

  const handleOwnerChange = (selected) => {
    setForm(prev => ({
      ...prev,
      owner_name: selected.name,
      ownership_type: selected.type,
      cost_center_id: selected.cost_center_id || '',
      allocation_target: selected.type === 'organization' ? 'shared' : prev.allocation_target
    }));
  };

  const calculateSplitAmounts = (totalAmount) => {
    return splitDetails.map(split => ({
      ...split,
      amount: (totalAmount * split.percentage) / 100
    }));
  };

  const handleAmountChange = (text) => {
    const processed = processCurrencyInput(text);
    setForm(prev => ({ ...prev, amount: processed }));
  };

  const handleAmountBlur = () => {
    const value = form.amount.trim();
    if (!value) {
      setForm(prev => ({ ...prev, amount: '' }));
      return;
    }
    const parsed = parseAmountValue(value);
    if (parsed > 0) {
      const formatted = formatCurrencyInput(parsed);
      setForm(prev => ({ ...prev, amount: formatted }));
    } else {
      setForm(prev => ({ ...prev, amount: '' }));
    }
  };

  const handleSave = async () => {
    if (!form.amount || parseAmountValue(form.amount) <= 0) {
      showToast('Informe um valor válido para o aporte', 'error');
      return;
    }

    if (!form.bank_account_id) {
      showToast('Selecione a conta de origem', 'error');
      return;
    }

    if (form.ownership_type === 'member' && !form.cost_center_id) {
      showToast('Selecione quem está aportando', 'error');
      return;
    }

    if (form.ownership_type === 'organization') {
      const totalPercentage = splitDetails.reduce((sum, split) => sum + parseFloat(split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        showToast('A soma dos percentuais deve ser 100%', 'error');
        return;
      }
    }

    try {
      setSaving(true);

      const amount = parseAmountValue(form.amount);
      const monthReference = form.date.substring(0, 7);

      const allocationData = {
        amount,
        date: form.date,
        description: form.description?.trim() || null,
        allocation_target: form.allocation_target,
        ownership_type: form.ownership_type,
        cost_center_id: form.ownership_type === 'member' ? form.cost_center_id : null,
        bank_account_id: form.bank_account_id,
        month_reference: monthReference,
        organization_id: organization.id,
        user_id: currentUser.id
      };

      const { data: allocation, error: allocationError } = await supabase
        .from('payment_allocations')
        .insert(allocationData)
        .select()
        .single();

      if (allocationError) throw allocationError;

      if (form.ownership_type === 'organization') {
        const splitsWithAmounts = calculateSplitAmounts(amount);
        const splitsToInsert = splitsWithAmounts
          .filter(split => split.percentage > 0)
          .map(split => ({
            payment_allocation_id: allocation.id,
            cost_center_id: split.cost_center_id,
            percentage: split.percentage,
            amount: split.amount
          }));

        if (splitsToInsert.length > 0) {
          const { error: splitsError } = await supabase
            .from('payment_allocation_splits')
            .insert(splitsToInsert);

          if (splitsError) throw splitsError;
        }
      }

      const transactionDescription = form.description?.trim() 
        || `Aporte para ${form.allocation_target === 'individual' ? 'despesas individuais' : 'despesas compartilhadas'}`;

      const { error: transactionError } = await supabase.rpc('create_bank_transaction', {
        p_bank_account_id: form.bank_account_id,
        p_transaction_type: 'manual_debit',
        p_amount: amount,
        p_description: transactionDescription,
        p_date: form.date,
        p_organization_id: organization.id,
        p_user_id: currentUser.id,
        p_expense_id: null,
        p_bill_id: null,
        p_income_id: null,
        p_related_account_id: null
      });

      if (transactionError) throw transactionError;

      showToast('Aporte registrado com sucesso!', 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar aporte:', error);
      showToast(error.message || 'Erro ao registrar aporte', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedOwner = ownerOptions.find(o => o.name === form.owner_name);
  const selectedBankAccount = bankAccounts.find(a => a.id === form.bank_account_id);
  const allocationTargetOptions = form.ownership_type === 'member' 
    ? [
        { value: 'individual', label: 'Despesas Individuais' },
        { value: 'shared', label: 'Despesas Compartilhadas' }
      ]
    : [{ value: 'shared', label: 'Despesas Compartilhadas' }];

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="semiBold">Registrar Aporte</Title2>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={saving}>
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
          >
            {/* Valor do Aporte */}
            <View style={styles.field}>
              <Caption weight="medium" style={{ marginBottom: spacing[1] }}>
                Valor do Aporte *
              </Caption>
              <View style={styles.currencyInputContainer}>
                <Caption style={styles.currencyPrefix}>R$</Caption>
                <TextInput
                  style={styles.currencyInput}
                  value={form.amount}
                  onChangeText={handleAmountChange}
                  onBlur={handleAmountBlur}
                  placeholder="0,00"
                  keyboardType="numeric"
                  editable={!saving}
                />
              </View>
            </View>

            {/* Data */}
            <View style={styles.field}>
              <Caption weight="medium" style={{ marginBottom: spacing[1] }}>
                Data *
              </Caption>
              <Input
                type="date"
                value={form.date}
                onChangeText={(value) => setForm(prev => ({ ...prev, date: value }))}
                editable={!saving}
              />
            </View>

            {/* Quem está aportando */}
            <SelectField
              label="Quem está aportando? *"
              value={form.owner_name}
              placeholder="Selecione..."
              onPress={() => setActiveSheet('owner')}
              disabled={saving}
            />

            {/* Destinar para */}
            <SelectField
              label="Destinar para *"
              value={allocationTargetOptions.find(o => o.value === form.allocation_target)?.label}
              placeholder="Selecione..."
              onPress={() => setActiveSheet('allocation_target')}
              disabled={saving || form.ownership_type === 'organization'}
            />

            {/* Conta de Origem */}
            <SelectField
              label="Conta de Origem *"
              value={selectedBankAccount?.name}
              placeholder="Selecione a conta"
              onPress={() => setActiveSheet('bank_account')}
              disabled={saving}
            />

            {/* Descrição */}
            <View style={styles.field}>
              <Caption weight="medium" style={{ marginBottom: spacing[1] }}>
                Descrição (opcional)
              </Caption>
              <Input
                value={form.description}
                onChangeText={(value) => setForm(prev => ({ ...prev, description: value }))}
                placeholder="Ex: Aporte mensal"
                editable={!saving}
              />
            </View>

            {/* Preview do Impacto */}
            {form.ownership_type === 'organization' && form.amount && parseAmountValue(form.amount) > 0 && (
              <Card style={styles.previewCard}>
                <Subheadline weight="semiBold" style={{ marginBottom: spacing[2] }}>
                  Divisão do Aporte
                </Subheadline>
                {calculateSplitAmounts(parseAmountValue(form.amount)).map((split) => (
                  split.percentage > 0 && (
                    <View key={split.cost_center_id} style={styles.splitRow}>
                      <Callout>{split.cost_center_name}</Callout>
                      <Callout weight="semiBold">
                        {split.percentage.toFixed(1)}% = {formatCurrencyInput(split.amount)}
                      </Callout>
                    </View>
                  )
                ))}
              </Card>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              disabled={saving}
              style={styles.footerButton}
            />
            <Button
              title={saving ? 'Registrando...' : 'Registrar Aporte'}
              onPress={handleSave}
              disabled={saving}
              loading={saving}
              style={styles.footerButton}
            />
          </View>

          {/* Option Sheets */}
          <OptionSheet
            visible={activeSheet === 'owner'}
            onClose={() => setActiveSheet(null)}
            options={ownerOptions.map(o => ({ ...o, label: o.name, value: o.name }))}
            onSelect={handleOwnerChange}
            title="Quem está aportando?"
          />
          <OptionSheet
            visible={activeSheet === 'allocation_target'}
            onClose={() => setActiveSheet(null)}
            options={allocationTargetOptions}
            onSelect={(option) => setForm(prev => ({ ...prev, allocation_target: option.value }))}
            title="Destinar para"
          />
          <OptionSheet
            visible={activeSheet === 'bank_account'}
            onClose={() => setActiveSheet(null)}
            options={bankAccounts.map(a => ({ id: a.id, label: a.name, value: a.id }))}
            onSelect={(option) => setForm(prev => ({ ...prev, bank_account_id: option.id }))}
            title="Conta de Origem"
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
    maxHeight: height * 0.95,
    minHeight: height * 0.5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing[1.5],
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
    flex: 1,
  },
  contentContainer: {
    padding: spacing[3],
  },
  field: {
    marginBottom: spacing[3],
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    backgroundColor: colors.background.primary,
  },
  currencyPrefix: {
    paddingLeft: spacing[2],
    color: colors.text.secondary,
  },
  currencyInput: {
    flex: 1,
    padding: spacing[2],
    fontSize: 16,
    color: colors.text.primary,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    backgroundColor: colors.background.primary,
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  previewCard: {
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.brand.bg,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    flex: 1,
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
    padding: spacing[2],
  },
  sheetOption: {
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});

