import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Dimensions,
  Platform,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronDown, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Caption } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ALL_BANK_OPTIONS, getBankLabel } from '../../assets/banks/availableBanks';

const { height } = Dimensions.get('window');

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const ACCOUNT_TYPES = [
  { id: 'checking', label: 'Conta Corrente' },
  { id: 'savings', label: 'Poupança' },
  { id: 'investment', label: 'Investimento' },
];

// Componente SelectField
const SelectField = ({ label, value, placeholder, onPress, disabled }) => (
  <View style={styles.field}>
    <Caption color="secondary" weight="medium" style={styles.label}>
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
      <Text variant="callout" numberOfLines={1} style={!value ? styles.selectPlaceholder : null}>
        {value || placeholder}
      </Text>
      <ChevronDown size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  </View>
);

// Componente OptionSheet
const OptionSheet = ({ visible, title, options = [], selectedId, onSelect, onClose }) => {
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
            <TouchableOpacity 
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
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

const defaultForm = {
  name: '',
  bank: '',
  account_type: 'checking',
  current_balance: '',
  is_active: true,
};

export function BankAccountFormModal({ visible, onClose, onSave, account }) {
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  const [formData, setFormData] = useState(defaultForm);
  const [activeSheet, setActiveSheet] = useState(null);

  useEffect(() => {
    if (visible) {
      // Se o banco não está na lista de bancos disponíveis, usa 'other'
      const bankValue = account?.bank && ALL_BANK_OPTIONS.find(b => b.id === account.bank) 
        ? account.bank 
        : (account?.bank ? 'other' : '');
      
      setFormData({
        name: account?.name || '',
        bank: bankValue,
        account_type: account?.account_type || 'checking',
        current_balance:
          account?.current_balance !== undefined && account?.current_balance !== null
            ? String(account.current_balance)
            : '',
        is_active: account?.is_active !== undefined ? account.is_active : true,
      });
    } else {
      setFormData(defaultForm);
    }
  }, [visible, account]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Informe o nome da conta.');
      return;
    }

    // Se for "Outros", salva como string vazia ou null para usar logo da app
    const bankValue = formData.bank === 'other' ? '' : formData.bank;
    
    onSave({
      ...formData,
      bank: bankValue,
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
          <View style={styles.handle} />
          <View style={styles.header}>
            <Title2 weight="semiBold">
              {account ? 'Editar Conta' : 'Nova Conta'}
            </Title2>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              accessibilityHint="Fechar formulário de conta bancária"
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4],
              gap: spacing[3]
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
          >
            <View style={styles.field}>
              <Caption color="secondary" weight="medium">Nome *</Caption>
              <Input
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="Ex: Conta Principal"
              />
            </View>

            <SelectField
              label="Banco"
              value={formData.bank ? getBankLabel(formData.bank) : ''}
              placeholder="Selecione o banco"
              onPress={() => setActiveSheet('bank')}
            />

            <SelectField
              label="Tipo *"
              value={ACCOUNT_TYPES.find(t => t.id === formData.account_type)?.label || ''}
              placeholder="Selecione o tipo de conta"
              onPress={() => setActiveSheet('accountType')}
            />

            {!account && (
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Saldo Atual</Caption>
                <Input
                  value={formData.current_balance}
                  onChangeText={(text) => handleChange('current_balance', text.replace(/[^0-9.,-]/g, ''))}
                  keyboardType="numeric"
                  placeholder="0,00"
                />
              </View>
            )}

            <View style={styles.switchRow}>
              <Caption color="secondary" weight="medium">Conta ativa</Caption>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => handleChange('is_active', value)}
                trackColor={{ true: colors.brand.primary, false: colors.neutral[300] }}
              />
            </View>
          </ScrollView>

          <View style={[
            styles.footer,
            { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }
          ]}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title={account ? 'Salvar' : 'Adicionar'}
              variant="primary"
              onPress={handleSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Option Sheets */}
      <OptionSheet
        visible={activeSheet === 'accountType'}
        title="Selecione o Tipo de Conta"
        options={ACCOUNT_TYPES}
        selectedId={formData.account_type}
        onSelect={(option) => handleChange('account_type', option.id)}
        onClose={() => setActiveSheet(null)}
      />
      <OptionSheet
        visible={activeSheet === 'bank'}
        title="Selecione o Banco"
        options={ALL_BANK_OPTIONS}
        selectedId={formData.bank}
        onSelect={(option) => handleChange('bank', option.id)}
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
    padding: spacing[3],
    maxHeight: height * 0.85,
    flexDirection: 'column',
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.round,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  closeButton: {
    padding: spacing[1],
  },
  field: {
    gap: spacing[1],
  },
  label: {
    marginBottom: spacing[1],
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
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
    paddingTop: spacing[3],
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


