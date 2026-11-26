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
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { useToast } from '../components/ui/Toast';
import { useI18n } from '../contexts/I18nContext';
import { decimalSeparator } from '@fintrack/shared/i18n';
import { categoryLabel } from '../utils/categoryLabel';
import { sanitizeAmountInput, amountPlaceholder } from '../utils/amountInput';
import { typography } from '../theme';

// Labels come from t('transactions.paymentMethodsLong.*').
const PAYMENT_METHODS = ['pix', 'credit_card', 'debit_card', 'cash', 'bank_transfer', 'boleto'];

// Stored when the user picks no category: the default DB category name
// (data, not copy; shown through categoryLabel()).
const DEFAULT_CATEGORY_NAME = 'Outros';

export default function AddTransactionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { t, parseMoney, currencySymbol, currency } = useI18n();
  const { showToast } = useToast();
  const sep = decimalSeparator();
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

  const amount = Math.round(parseMoney(amountRaw) * 100) / 100;

  const handleAmountChange = (text) => setAmountRaw(sanitizeAmountInput(text, sep));

  const handleSave = async () => {
    if (amount <= 0) return;
    if (!organization?.id) return;

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (type === 'expense') {
        const { error } = await supabase.from('expenses').insert({
          organization_id: organization.id,
          description: description || t('transactions.noDescription'),
          amount,
          date: today,
          budget_category_id: categoryId,
          budget_category_name: category || DEFAULT_CATEGORY_NAME,
          payment_method: paymentMethod,
          cost_center_id: costCenterId,
          status: 'confirmed',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('incomes').insert({
          organization_id: organization.id,
          description: description || t('transactions.noDescription'),
          amount,
          date: today,
          income_category_id: categoryId,
          income_category_name: category || DEFAULT_CATEGORY_NAME,
          status: 'confirmed',
        });
        if (error) throw error;
      }

      navigation.goBack();
    } catch (err) {
      console.error('Error saving transaction:', err);
      showToast(t('transactions.add.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const surfaceBg = colors.background.secondary;
  const borderColor = colors.border.light;
  const isExpense = type === 'expense';
  const methodLabel = (key) => t(`transactions.paymentMethodsLong.${key}`, { defaultValue: key });
  const paymentLabel = methodLabel(paymentMethod);
  const costCenterName = costCenters?.find(c => c.id === costCenterId)?.name;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.cancelText, { color: colors.text.secondary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">{t('transactions.add.title')}</Text>
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
            style={[styles.typeBtn, isExpense && { backgroundColor: colors.error.main }]}
            onPress={() => setType('expense')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isExpense }}
          >
            <Text style={[styles.typeBtnText, { color: colors.text.secondary }, isExpense && { color: 'white' }]}>{t('transactions.add.expense')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, !isExpense && { backgroundColor: colors.success.main }]}
            onPress={() => setType('income')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: !isExpense }}
          >
            <Text style={[styles.typeBtnText, { color: colors.text.secondary }, !isExpense && { color: 'white' }]}>{t('transactions.add.income')}</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={[styles.amountLabel, { color: colors.text.secondary }]}>{t('transactions.add.amount')}</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: colors.text.secondary }]}>{currencySymbol()}</Text>
            <TextInput
              ref={amountRef}
              style={[styles.amountInput, typography.tabularNums, { color: colors.text.primary }]}
              value={amountRaw}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              placeholder={amountPlaceholder(sep)}
              placeholderTextColor={colors.text.tertiary}
              accessibilityLabel={t('transactions.add.amountA11y', { currency })}
              autoFocus
            />
          </View>
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <FieldRow
            label={t('transactions.add.description')}
            surfaceBg={surfaceBg}
            borderColor={borderColor}
            textColor={colors.text.primary}
          >
            <TextInput
              style={[styles.fieldInput, { color: colors.text.primary }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('transactions.add.descriptionPlaceholder')}
              accessibilityLabel={t('transactions.add.description')}
              placeholderTextColor={colors.text.tertiary}
              textAlign="right"
            />
          </FieldRow>

          <FieldRow
            label={t('transactions.add.category')}
            surfaceBg={surfaceBg}
            borderColor={borderColor}
            textColor={colors.text.primary}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View style={styles.fieldValueRow}>
              {category ? (
                <>
                  <CategoryIcon category={category} size={22} iconSize={12} />
                  <Text style={[styles.fieldValue, { color: colors.text.primary }]}>{categoryLabel(category, t)}</Text>
                </>
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text.tertiary }]}>{t('transactions.add.choose')}</Text>
              )}
              <ChevronRight size={16} color={colors.text.tertiary} />
            </View>
          </FieldRow>

          {isExpense && (
            <FieldRow
              label={t('transactions.add.payment')}
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
              label={t('transactions.add.responsible')}
              surfaceBg={surfaceBg}
              borderColor={borderColor}
              textColor={colors.text.primary}
              onPress={() => setShowCostCenterPicker(true)}
            >
              <View style={styles.fieldValueRow}>
                <Text style={[styles.fieldValue, { color: costCenterName ? colors.text.primary : colors.text.tertiary }]}>
                  {costCenterName || t('transactions.add.choose')}
                </Text>
                <ChevronRight size={16} color={colors.text.tertiary} />
              </View>
            </FieldRow>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.brand.primary }, amount <= 0 && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || amount <= 0}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || amount <= 0, busy: saving }}
          accessibilityLabel={saving ? t('transactions.add.saving') : t('common.save')}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
        <Text style={[styles.whatsappHint, { color: colors.text.secondary }]}>{t('transactions.add.whatsappHint')}</Text>
      </ScrollView>

      {/* Category Picker Modal */}
      <PickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title={t('transactions.add.category')}
        closeLabel={t('common.close')}
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
            <Text style={[styles.pickerItemText, { color: colors.text.primary }]}>{categoryLabel(cat.name, t)}</Text>
            {category === cat.name && <View style={[styles.pickerCheck, { backgroundColor: colors.brand.primary }]} />}
          </TouchableOpacity>
        ))}
      </PickerModal>

      {/* Payment Picker Modal */}
      <PickerModal
        visible={showPaymentPicker}
        onClose={() => setShowPaymentPicker(false)}
        title={t('transactions.add.paymentMethod')}
        closeLabel={t('common.close')}
        surfaceBg={surfaceBg}
        borderColor={borderColor}
        textColor={colors.text.primary}
        secondaryColor={colors.text.tertiary}
        bg={colors.background.primary}
      >
        {PAYMENT_METHODS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.pickerItem, { borderBottomColor: borderColor }]}
            onPress={() => {
              setPaymentMethod(key);
              setShowPaymentPicker(false);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: paymentMethod === key }}
          >
            <Text style={[styles.pickerItemText, { color: colors.text.primary }]}>{methodLabel(key)}</Text>
            {paymentMethod === key && <View style={[styles.pickerCheck, { backgroundColor: colors.brand.primary }]} />}
          </TouchableOpacity>
        ))}
      </PickerModal>

      {/* Cost Center Picker Modal */}
      <PickerModal
        visible={showCostCenterPicker}
        onClose={() => setShowCostCenterPicker(false)}
        title={t('transactions.add.responsible')}
        closeLabel={t('common.close')}
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
            {costCenterId === cc.id && <View style={[styles.pickerCheck, { backgroundColor: colors.brand.primary }]} />}
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
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Text style={[styles.fieldLabel, { color: textColor }]}>{label}</Text>
      {children}
    </Wrapper>
  );
}

function PickerModal({ visible, onClose, title, closeLabel, children, borderColor, textColor, secondaryColor, bg }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={closeLabel}>
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
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },

  amountSection: { alignItems: 'center', paddingVertical: 28 },
  amountLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  currencySymbol: { fontSize: 28, fontWeight: '700' },
  amountInput: { fontSize: 48, fontWeight: '800', letterSpacing: -2, minWidth: 120 },

  fields: { gap: 12 },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  fieldLabel: { fontSize: 13 },
  fieldInput: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldValue: { fontSize: 14, fontWeight: '600' },

  saveBtn: {
    borderRadius: 999,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  whatsappHint: { fontSize: 13, textAlign: 'center', marginTop: 12 },
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
  pickerCheck: { width: 8, height: 8, borderRadius: 4 },
});
