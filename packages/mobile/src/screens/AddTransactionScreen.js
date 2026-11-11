import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronRight, X, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../services/supabase';
import { Text } from '../components/ui/Text';
import { CategoryIcon, CATEGORIES } from '../components/ui/CategoryIcon';
import { formatCurrency } from '@fintrack/shared/utils';

const PAYMENT_METHODS = [
  { key: 'pix', label: 'PIX' },
  { key: 'credit_card', label: 'Cartão de Crédito' },
  { key: 'debit_card', label: 'Cartão de Débito' },
  { key: 'cash', label: 'Dinheiro' },
  { key: 'bank_transfer', label: 'Transferência' },
  { key: 'boleto', label: 'Boleto' },
];

export default function AddTransactionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDark } = useTheme();
  const { organization, costCenters, budgetCategories } = useOrganization();
  const amountRef = useRef(null);

  const initialType = route.params?.type || 'expense';
  const [type, setType] = useState(initialType);
  const [amountRaw, setAmountRaw] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [costCenterId, setCostCenterId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showCostCenterPicker, setShowCostCenterPicker] = useState(false);

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, [organization]);

  const loadCategories = async () => {
    if (!organization?.id) return;
    const table = type === 'expense' ? 'budget_categories' : 'income_categories';
    const query = type === 'expense'
      ? supabase.from(table).select('id, name, color').or(`organization_id.eq.${organization.id},organization_id.is.null`)
      : supabase.from(table).select('id, name, color');
    const { data } = await query;
    setDbCategories(data || []);
  };

  useEffect(() => {
    loadCategories();
    setCategory('');
    setCategoryId(null);
  }, [type]);

  const amount = parseInt(amountRaw || '0', 10) / 100;

  const handleAmountChange = (text) => {
    const digits = text.replace(/\D/g, '');
    setAmountRaw(digits);
  };

  const displayAmount = () => {
    if (!amountRaw) return 'R$ 0,00';
    return formatCurrency(amount);
  };

  const handleSave = async () => {
    if (amount <= 0) return;
    if (!organization?.id) return;

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (type === 'expense') {
        const { error } = await supabase.from('expenses').insert({
          organization_id: organization.id,
          description: description || 'Sem descrição',
          amount,
          date: today,
          budget_category_id: categoryId,
          budget_category_name: category || 'Outros',
          payment_method: paymentMethod,
          cost_center_id: costCenterId,
          status: 'confirmed',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('incomes').insert({
          organization_id: organization.id,
          description: description || 'Sem descrição',
          amount,
          date: today,
          income_category_id: categoryId,
          income_category_name: category || 'Outros',
          status: 'confirmed',
        });
        if (error) throw error;
      }

      navigation.goBack();
    } catch (err) {
      console.error('Error saving transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  const surfaceBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#38383A' : '#E5E5EA';
  const isExpense = type === 'expense';
  const paymentLabel = PAYMENT_METHODS.find(p => p.key === paymentMethod)?.label || 'PIX';
  const costCenterName = costCenters?.find(c => c.id === costCenterId)?.name;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.cancelText, { color: colors.text.secondary }]}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova transação</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type toggle */}
        <View style={[styles.typeToggle, { backgroundColor: surfaceBg, borderColor }]}>
          <TouchableOpacity
            style={[styles.typeBtn, isExpense && styles.typeBtnExpense]}
            onPress={() => setType('expense')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeBtnText, isExpense && { color: 'white' }]}>Despesa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, !isExpense && styles.typeBtnIncome]}
            onPress={() => setType('income')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeBtnText, !isExpense && { color: 'white' }]}>Receita</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={[styles.amountLabel, { color: colors.text.tertiary }]}>Valor</Text>
          <TextInput
            ref={amountRef}
            style={[styles.amountInput, { color: colors.text.primary }]}
            value={displayAmount()}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            placeholder="R$ 0,00"
            placeholderTextColor={colors.text.tertiary}
            textAlign="center"
            caretHidden
          />
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <FieldRow
            label="Descrição"
            surfaceBg={surfaceBg}
            borderColor={borderColor}
            textColor={colors.text.primary}
          >
            <TextInput
              style={[styles.fieldInput, { color: colors.text.primary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Supermercado"
              placeholderTextColor={colors.text.tertiary}
              textAlign="right"
            />
          </FieldRow>

          <FieldRow
            label="Categoria"
            surfaceBg={surfaceBg}
            borderColor={borderColor}
            textColor={colors.text.primary}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View style={styles.fieldValueRow}>
              {category ? (
                <>
                  <CategoryIcon category={category} size={22} iconSize={12} />
                  <Text style={[styles.fieldValue, { color: colors.text.primary }]}>{category}</Text>
                </>
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text.tertiary }]}>Selecionar</Text>
              )}
              <ChevronRight size={16} color={colors.text.tertiary} />
            </View>
          </FieldRow>

          {isExpense && (
            <FieldRow
              label="Pagamento"
              surfaceBg={surfaceBg}
              borderColor={borderColor}
              textColor={colors.text.primary}
              onPress={() => setShowPaymentPicker(true)}
            >
              <View style={styles.fieldValueRow}>
                <Text style={[styles.fieldValue, { color: colors.text.primary }]}>{paymentLabel}</Text>
                <ChevronRight size={16} color={colors.text.tertiary} />
              </View>
            </FieldRow>
          )}

          {costCenters && costCenters.length > 1 && (
            <FieldRow
              label="Responsável"
              surfaceBg={surfaceBg}
              borderColor={borderColor}
              textColor={colors.text.primary}
              onPress={() => setShowCostCenterPicker(true)}
            >
              <View style={styles.fieldValueRow}>
                <Text style={[styles.fieldValue, { color: costCenterName ? colors.text.primary : colors.text.tertiary }]}>
                  {costCenterName || 'Selecionar'}
                </Text>
                <ChevronRight size={16} color={colors.text.tertiary} />
              </View>
            </FieldRow>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, amount <= 0 && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || amount <= 0}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category Picker Modal */}
      <PickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title="Categoria"
        surfaceBg={surfaceBg}
        borderColor={borderColor}
        textColor={colors.text.primary}
        secondaryColor={colors.text.tertiary}
        bg={colors.background.primary}
      >
        {dbCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.pickerItem, { borderBottomColor: borderColor }]}
            onPress={() => {
              setCategory(cat.name);
              setCategoryId(cat.id);
              setShowCategoryPicker(false);
            }}
          >
            <CategoryIcon category={cat.name} size={32} iconSize={16} />
            <Text style={[styles.pickerItemText, { color: colors.text.primary }]}>{cat.name}</Text>
            {category === cat.name && <View style={styles.pickerCheck} />}
          </TouchableOpacity>
        ))}
      </PickerModal>

      {/* Payment Picker Modal */}
      <PickerModal
        visible={showPaymentPicker}
        onClose={() => setShowPaymentPicker(false)}
        title="Forma de pagamento"
        surfaceBg={surfaceBg}
        borderColor={borderColor}
        textColor={colors.text.primary}
        secondaryColor={colors.text.tertiary}
        bg={colors.background.primary}
      >
        {PAYMENT_METHODS.map((pm) => (
          <TouchableOpacity
            key={pm.key}
            style={[styles.pickerItem, { borderBottomColor: borderColor }]}
            onPress={() => {
              setPaymentMethod(pm.key);
              setShowPaymentPicker(false);
            }}
          >
            <Text style={[styles.pickerItemText, { color: colors.text.primary }]}>{pm.label}</Text>
            {paymentMethod === pm.key && <View style={styles.pickerCheck} />}
          </TouchableOpacity>
        ))}
      </PickerModal>

      {/* Cost Center Picker Modal */}
      <PickerModal
        visible={showCostCenterPicker}
        onClose={() => setShowCostCenterPicker(false)}
        title="Responsável"
        surfaceBg={surfaceBg}
        borderColor={borderColor}
        textColor={colors.text.primary}
        secondaryColor={colors.text.tertiary}
        bg={colors.background.primary}
      >
        {(costCenters || []).map((cc) => (
          <TouchableOpacity
            key={cc.id}
            style={[styles.pickerItem, { borderBottomColor: borderColor }]}
            onPress={() => {
              setCostCenterId(cc.id);
              setShowCostCenterPicker(false);
            }}
          >
            <Text style={[styles.pickerItemText, { color: colors.text.primary }]}>{cc.name}</Text>
            {costCenterId === cc.id && <View style={styles.pickerCheck} />}
          </TouchableOpacity>
        ))}
      </PickerModal>
    </KeyboardAvoidingView>
  );
}

function FieldRow({ label, children, surfaceBg, borderColor, textColor, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.fieldRow, { backgroundColor: surfaceBg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.fieldLabel, { color: textColor }]}>{label}</Text>
      {children}
    </Wrapper>
  );
}

function PickerModal({ visible, onClose, title, children, surfaceBg, borderColor, textColor, secondaryColor, bg }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={20} color={secondaryColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  cancelText: { fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  typeToggle: {
    flexDirection: 'row', borderRadius: 12, padding: 3,
    borderWidth: 1, marginBottom: 8,
  },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeBtnExpense: { backgroundColor: '#FF3B30' },
  typeBtnIncome: { backgroundColor: '#34C759' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },

  amountSection: { alignItems: 'center', paddingVertical: 28 },
  amountLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  amountInput: { fontSize: 48, fontWeight: '800', letterSpacing: -2, minWidth: 200, textAlign: 'center' },

  fields: { gap: 10 },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  fieldLabel: { fontSize: 13 },
  fieldInput: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldValue: { fontSize: 14, fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#1A6AFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalScroll: { paddingHorizontal: 16 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemText: { flex: 1, fontSize: 15, fontWeight: '500' },
  pickerCheck: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A6AFF' },
});
