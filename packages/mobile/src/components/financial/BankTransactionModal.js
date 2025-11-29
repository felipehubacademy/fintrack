import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X, ArrowRight, ChevronDown, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Headline, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
// Componente SelectField para dropdowns
const SelectField = ({ label, value, placeholder, onPress, disabled, editable = true }) => (
  <View style={styles.field}>
    {label ? (
      <Caption color="secondary" weight="medium" style={styles.label}>
        {label}
      </Caption>
    ) : null}
    <TouchableOpacity
      style={[
        styles.selectField,
        disabled && styles.selectFieldDisabled,
        !value && styles.selectFieldEmpty,
      ]}
      onPress={disabled || !editable ? undefined : onPress}
      activeOpacity={disabled || !editable ? 1 : 0.7}
    >
      <Text
        variant="callout"
        numberOfLines={1}
        style={!value ? styles.selectPlaceholder : null}
      >
        {value || placeholder}
      </Text>
      <ChevronDown size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  </View>
);

// Componente OptionSheet
const OptionSheet = ({
  visible,
  title,
  options = [],
  selectedId,
  onSelect,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheetContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHeader}>
            <Title2 weight="semiBold">{title}</Title2>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sheetOption,
                  selectedId === option.id && styles.sheetOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text variant="callout">{option.label}</Text>
                {selectedId === option.id && (
                  <Check size={20} color={colors.brand.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
import { useToast } from '../ui/Toast';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';

const { height } = Dimensions.get('window');

const getBrazilTodayString = () => {
  const now = new Date();
  const brazilOffset = -3 * 60; // UTC-3
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (brazilOffset * 60000));
  const year = brazilTime.getFullYear();
  const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
  const day = String(brazilTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const formatCurrencyInput = (value) => {
  if (!value || value === 0) return '';
  const num = typeof value === 'string' ? parseAmountValue(value) : value;
  if (num === 0) return '';
  return num.toFixed(2).replace('.', ',');
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

export default function BankTransactionModal({
  visible,
  onClose,
  account,
  organizationId,
  onSuccess,
}) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    to_account_id: '',
    amount: '',
    description: '',
    date: getBrazilTodayString(),
  });
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);

  useEffect(() => {
    if (visible && organizationId) {
      fetchAvailableAccounts();
      resetForm();
    }
  }, [visible, organizationId, account]);

  const fetchAvailableAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, bank')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .neq('id', account?.id)
        .order('name');

      if (error) throw error;
      setAvailableAccounts(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      showToast('Erro ao buscar contas disponíveis', 'error');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const resetForm = () => {
    setFormData({
      to_account_id: '',
      amount: '',
      description: '',
      date: getBrazilTodayString(),
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAmountChange = (text) => {
    const processed = processCurrencyInput(text);
    handleChange('amount', processed);
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.to_account_id) {
      showToast('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    const amount = parseAmountValue(formData.amount);
    if (amount <= 0) {
      showToast('O valor deve ser maior que zero', 'warning');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (!organizationId) throw new Error('Organização não encontrada');

      const { error } = await supabase.rpc('transfer_between_accounts', {
        p_from_account_id: account.id,
        p_to_account_id: formData.to_account_id,
        p_amount: amount,
        p_description: formData.description || 'Transferência entre contas',
        p_date: formData.date,
        p_organization_id: organizationId,
        p_user_id: user.id,
      });

      if (error) throw error;

      resetForm();
      showToast('Transferência realizada com sucesso!', 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao realizar transferência:', error);
      showToast(
        'Erro ao realizar transferência: ' + (error.message || 'Erro desconhecido'),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedToAccount = availableAccounts.find(
    (a) => a.id === formData.to_account_id
  );

  if (!visible || !account) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
              <View style={styles.headerContent}>
                <Title2 weight="semiBold">Transferir Entre Contas</Title2>
              </View>
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
              {/* Conta de Origem */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium" style={styles.label}>
                  Conta de Origem
                </Caption>
                <Input
                  value={`${account?.name} - ${account?.bank || ''}`}
                  editable={false}
                  style={styles.disabledInput}
                />
              </View>

              {/* Conta de Destino */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium" style={styles.label}>
                  Conta de Destino *
                </Caption>
                {loadingAccounts ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                    <Caption color="secondary" style={{ marginLeft: spacing[1] }}>
                      Carregando contas...
                    </Caption>
                  </View>
                ) : availableAccounts.length === 0 ? (
                  <View style={styles.warningContainer}>
                    <Caption color="secondary">
                      Nenhuma outra conta ativa disponível para transferência
                    </Caption>
                  </View>
                ) : (
                  <SelectField
                    label=""
                    value={
                      selectedToAccount
                        ? `${selectedToAccount.name} - ${selectedToAccount.bank || ''}`
                        : ''
                    }
                    placeholder="Selecione a conta de destino"
                    onPress={() => setActiveSheet('to_account')}
                    editable={!saving}
                  />
                )}
              </View>

              {/* Valor e Data */}
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1, marginRight: spacing[1] }]}>
                  <Caption color="secondary" weight="medium" style={styles.label}>
                    Valor (R$) *
                  </Caption>
                  <View style={styles.amountContainer}>
                    <Caption style={styles.currencySymbol}>R$</Caption>
                    <Input
                      value={formData.amount}
                      onChangeText={handleAmountChange}
                      placeholder="0,00"
                      keyboardType="numeric"
                      style={styles.amountInput}
                      editable={!saving}
                    />
                  </View>
                </View>

                <View style={[styles.field, { flex: 1, marginLeft: spacing[1] }]}>
                  <Caption color="secondary" weight="medium" style={styles.label}>
                    Data *
                  </Caption>
                  <Input
                    value={formData.date}
                    onChangeText={(text) => handleChange('date', text)}
                    placeholder="YYYY-MM-DD"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Descrição */}
              <View style={styles.field}>
                <Caption color="secondary" weight="medium" style={styles.label}>
                  Descrição (opcional)
                </Caption>
                <Input
                  value={formData.description}
                  onChangeText={(text) => handleChange('description', text)}
                  placeholder="Ex: Transferência para investimento, etc."
                  editable={!saving}
                />
              </View>

              {/* Indicador Visual */}
              {formData.to_account_id && formData.amount && (
                <View style={styles.visualIndicator}>
                  <View style={styles.visualItem}>
                    <Caption color="secondary" style={styles.visualLabel}>
                      De
                    </Caption>
                    <Headline weight="semiBold">{account?.name}</Headline>
                  </View>
                  <ArrowRight size={20} color={colors.brand.primary} />
                  <View style={styles.visualItem}>
                    <Caption color="secondary" style={styles.visualLabel}>
                      Para
                    </Caption>
                    <Headline weight="semiBold">
                      {selectedToAccount?.name || ''}
                    </Headline>
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
                style={styles.footerButton}
              />
              <Button
                title={saving ? 'Transferindo...' : 'Transferir'}
                onPress={handleSubmit}
                disabled={saving || availableAccounts.length === 0}
                style={styles.footerButton}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Option Sheet para seleção de conta */}
      <OptionSheet
        visible={activeSheet === 'to_account'}
        onClose={() => setActiveSheet(null)}
        options={availableAccounts.map((acc) => ({
          id: acc.id,
          label: `${acc.name} - ${acc.bank || ''}`,
        }))}
        onSelect={(option) => {
          handleChange('to_account_id', option.id);
          setActiveSheet(null);
        }}
        title="Selecione a conta de destino"
      />
    </>
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
    width: '100%',
    minHeight: 500,
    padding: spacing[3],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing[2],
  },
  field: {
    marginBottom: spacing[3],
  },
  label: {
    marginBottom: spacing[1],
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  disabledInput: {
    backgroundColor: colors.neutral[100],
    color: colors.text.secondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  warningContainer: {
    padding: spacing[2],
    backgroundColor: colors.warning.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning.main,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    backgroundColor: colors.background.primary,
  },
  currencySymbol: {
    paddingLeft: spacing[2],
    paddingRight: spacing[1],
    color: colors.text.secondary,
  },
  amountInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  visualIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    backgroundColor: colors.brand.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primary + '20',
    marginTop: spacing[2],
  },
  visualItem: {
    flex: 1,
    alignItems: 'center',
  },
  visualLabel: {
    marginBottom: spacing[0.5],
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    flex: 1,
  },
  selectField: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.background.secondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingBottom: spacing[4],
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetContent: {
    maxHeight: height * 0.5,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetOptionSelected: {
    backgroundColor: colors.brand.bg,
  },
});

