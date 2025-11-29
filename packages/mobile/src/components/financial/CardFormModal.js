import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X, ChevronDown, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Title2, Caption, Callout, Text } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ALL_BANK_OPTIONS, getBankLabel } from '../../assets/banks/availableBanks';

const { height } = Dimensions.get('window');

const COLOR_OPTIONS = ['#2563EB', '#EA580C', '#9333EA', '#16A34A', '#4B5563', '#DC2626'];

const defaultForm = {
  name: '',
  bank: '',
  holder_name: '',
  credit_limit: '',
  billing_day: '',
  closing_day: '',
  color: COLOR_OPTIONS[0],
};

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

export function CardFormModal({ visible, onClose, onSave, card }) {
  const [formData, setFormData] = useState(defaultForm);
  const [activeSheet, setActiveSheet] = useState(null);

  useEffect(() => {
    if (visible && card) {
      // Converter cor hex para formato do formulário
      const cardColor = card.color || COLOR_OPTIONS[0];
      
      // Se o banco não está na lista de bancos disponíveis, usa 'other'
      const bankValue = card.bank && ALL_BANK_OPTIONS.find(b => b.id === card.bank) 
        ? card.bank 
        : (card.bank ? 'other' : '');
      
      setFormData({
        name: card.name || '',
        bank: bankValue,
        holder_name: card.holder_name || '',
        credit_limit:
          card.credit_limit !== undefined && card.credit_limit !== null
            ? String(card.credit_limit)
            : '',
        billing_day:
          card.billing_day !== undefined && card.billing_day !== null
            ? String(card.billing_day)
            : '',
        closing_day:
          card.closing_day !== undefined && card.closing_day !== null
            ? String(card.closing_day)
            : '',
        color: cardColor,
      });
    } else {
      setFormData(defaultForm);
    }
  }, [visible, card]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Calcular best_day automaticamente quando closing_day mudar
      if (field === 'closing_day' && value) {
        const closingDay = parseInt(value);
        if (!isNaN(closingDay) && closingDay >= 1 && closingDay <= 31) {
          // Melhor dia = dia seguinte ao fechamento (ou 1 se fechamento for 31)
          updated.best_day = closingDay === 31 ? 1 : closingDay + 1;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Informe o nome do cartão.');
      return;
    }

    if (!formData.bank || formData.bank === '') {
      alert('Selecione o banco.');
      return;
    }

    if (!formData.holder_name.trim()) {
      alert('Informe o titular.');
      return;
    }

    if (!formData.credit_limit || Number(formData.credit_limit.replace(/[^0-9.,]/g, '').replace(',', '.')) <= 0) {
      alert('Limite do cartão deve ser maior que zero.');
      return;
    }

    if (!formData.billing_day || parseInt(formData.billing_day) < 1 || parseInt(formData.billing_day) > 31) {
      alert('Dia de vencimento deve ser entre 1 e 31.');
      return;
    }

    // Calcular best_day baseado no closing_day
    let bestDay = null;
    if (formData.closing_day) {
      const closingDay = parseInt(formData.closing_day);
      if (!isNaN(closingDay) && closingDay >= 1 && closingDay <= 31) {
        bestDay = closingDay === 31 ? 1 : closingDay + 1;
      }
    }

    // Converter limite para número
    const creditLimit = Number(formData.credit_limit.replace(/[^0-9.,]/g, '').replace(',', '.'));

    // Se for "Outros", salva como string vazia ou null para usar logo da app
    const bankValue = formData.bank === 'other' ? '' : formData.bank;

    onSave({
      name: formData.name.trim(),
      bank: bankValue,
      holder_name: formData.holder_name.trim(),
      type: 'credit', // Sempre crédito
      credit_limit: creditLimit,
      billing_day: parseInt(formData.billing_day),
      closing_day: formData.closing_day ? parseInt(formData.closing_day) : null,
      best_day: bestDay,
      color: formData.color,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Title2 weight="semiBold">
              {card ? 'Editar Cartão' : 'Novo Cartão'}
            </Title2>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              accessibilityHint="Fechar formulário de cartão"
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 500 }}
            contentContainerStyle={{ paddingBottom: spacing[4], gap: spacing[3] }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.field}>
              <Caption color="secondary" weight="medium">Nome *</Caption>
              <Input
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="Ex: Cartão Azul"
              />
            </View>

            <SelectField
              label="Banco *"
              value={formData.bank ? getBankLabel(formData.bank) : ''}
              placeholder="Selecione o banco"
              onPress={() => setActiveSheet('bank')}
            />

            <View style={styles.field}>
              <Caption color="secondary" weight="medium">Titular *</Caption>
              <Input
                value={formData.holder_name}
                onChangeText={(text) => handleChange('holder_name', text)}
                placeholder="Nome completo"
              />
            </View>

            <View style={styles.field}>
              <Caption color="secondary" weight="medium">Limite de Crédito *</Caption>
              <Input
                value={formData.credit_limit}
                onChangeText={(text) => handleChange('credit_limit', text.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
            </View>

            <View style={styles.doubleRow}>
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Dia de Vencimento *</Caption>
                <Input
                  value={formData.billing_day}
                  onChangeText={(text) => handleChange('billing_day', text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="Ex: 15"
                  maxLength={2}
                />
              </View>
              <View style={styles.field}>
                <Caption color="secondary" weight="medium">Dia de Fechamento</Caption>
                <Input
                  value={formData.closing_day}
                  onChangeText={(text) => handleChange('closing_day', text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="Ex: 10"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Caption color="secondary" weight="medium">Cor</Caption>
              <View style={styles.colorsRow}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      formData.color === color && styles.colorDotActive,
                    ]}
                    onPress={() => handleChange('color', color)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title={card ? 'Salvar' : 'Adicionar'}
              variant="primary"
              onPress={handleSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Option Sheets */}
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
    flex: 1,
  },
  doubleRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing[1.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '15',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: spacing[1.5],
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
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


