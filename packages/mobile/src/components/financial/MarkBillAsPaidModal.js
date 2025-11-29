import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X, AlertCircle, ChevronDown, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { formatCurrency } from '@fintrack/shared/utils';

const { height } = Dimensions.get('window');

// Componente SelectField
const SelectField = ({ label, value, placeholder, onPress, disabled }) => (
  <View style={selectStyles.field}>
    <Caption color="secondary" weight="medium" style={selectStyles.label}>
      {label}
    </Caption>
    <TouchableOpacity
      style={[
        selectStyles.selectField,
        disabled && selectStyles.selectFieldDisabled,
        !value && selectStyles.selectFieldEmpty,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text variant="callout" numberOfLines={1} style={!value ? selectStyles.selectPlaceholder : null}>
        {value || placeholder}
      </Text>
      <ChevronDown size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  </View>
);

// Componente OptionSheet
const OptionSheet = ({ visible, onClose, title, options = [], selectedValue, onSelect }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={selectStyles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={selectStyles.sheetContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={selectStyles.sheetHeader}>
            <Title2 weight="semiBold">{title}</Title2>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={selectStyles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled={true}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  selectStyles.sheetOption,
                  selectedValue === option.value && selectStyles.sheetOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option.value);
                }}
              >
                <Text variant="callout">{option.label}</Text>
                {selectedValue === option.value && (
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

export function MarkBillAsPaidModal({
  visible,
  onClose,
  onConfirm,
  bill,
  costCenters = [],
  organization = null,
}) {
  const [selectedOwner, setSelectedOwner] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [showOwnerSheet, setShowOwnerSheet] = useState(false);

  useEffect(() => {
    if (bill && visible) {
      if (bill.cost_center_id) {
        setSelectedOwner(bill.cost_center_id);
        setIsShared(false);
      } else {
        setIsShared(bill.is_shared || false);
        setSelectedOwner('');
      }
    }
  }, [bill, visible]);

  const handleConfirm = () => {
    if (!isShared && !selectedOwner) {
      return;
    }

    onConfirm({
      cost_center_id: isShared ? null : selectedOwner,
      is_shared: isShared,
    });
  };

  if (!visible || !bill) return null;

  const ownerOptions = costCenters
    .filter(cc => cc.is_active !== false && !cc.is_shared)
    .map(cc => ({ value: cc.id, label: cc.name }));

  const selectedOwnerLabel = ownerOptions.find(opt => opt.value === selectedOwner)?.label || '';

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <AlertCircle size={24} color={colors.warning.main} />
              <Title2 weight="bold">Confirmar pagamento</Title2>
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
            <Callout style={{ marginBottom: spacing[2] }}>
              Marcar <Callout weight="bold">{bill.description}</Callout> ({formatCurrency(bill.amount)}) como paga?
            </Callout>
            <Caption color="secondary" style={{ marginBottom: spacing[4] }}>
              Isso criará uma despesa automaticamente.
            </Caption>

            {/* Quem pagou? */}
            <View style={styles.section}>
              <Caption weight="semiBold" style={{ marginBottom: spacing[2] }}>
                Quem pagou? *
              </Caption>

              {/* Opção Compartilhado */}
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => {
                  setIsShared(true);
                  setSelectedOwner('');
                }}
              >
                <View style={[styles.radio, isShared && styles.radioSelected]}>
                  {isShared && <View style={styles.radioInner} />}
                </View>
                <Callout>{organization?.name || 'Família'}</Callout>
              </TouchableOpacity>

              {/* Opção Individual */}
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => {
                  setIsShared(false);
                  if (!selectedOwner && ownerOptions.length > 0) {
                    setSelectedOwner(ownerOptions[0].value);
                  }
                }}
              >
                <View style={[styles.radio, !isShared && styles.radioSelected]}>
                  {!isShared && <View style={styles.radioInner} />}
                </View>
                <Callout>Individual</Callout>
              </TouchableOpacity>

              {/* Select de responsável (se individual) */}
              {!isShared && (
                <View style={styles.ownerSelect}>
                  <SelectField
                    label="Responsável"
                    value={selectedOwnerLabel || 'Selecione o responsável...'}
                    onPress={() => setShowOwnerSheet(true)}
                    placeholder="Selecione o responsável..."
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title="Marcar como Paga"
              onPress={handleConfirm}
              disabled={!isShared && !selectedOwner}
              style={{ flex: 1 }}
            />
          </View>

          {/* Owner Options Sheet */}
          <OptionSheet
            visible={showOwnerSheet}
            onClose={() => setShowOwnerSheet(false)}
            title="Selecione o responsável"
            options={ownerOptions}
            selectedValue={selectedOwner}
            onSelect={(value) => {
              setSelectedOwner(value);
              setShowOwnerSheet(false);
            }}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: height * 0.8,
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
  section: {
    marginBottom: spacing[4],
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.brand.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
  },
  ownerSelect: {
    marginTop: spacing[2],
    marginLeft: spacing[6],
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

const selectStyles = StyleSheet.create({
  field: {
    marginBottom: spacing[2],
  },
  label: {
    marginBottom: spacing[1],
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  selectFieldEmpty: {
    borderColor: colors.border.light,
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
    maxHeight: height * 0.6,
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetOptionSelected: {
    backgroundColor: colors.brand.bg,
  },
});

