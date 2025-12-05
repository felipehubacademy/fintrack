import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView as RNScrollView,
  TextInput,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trash2, Plus, AlertTriangle, Check, ChevronDown } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Callout, Caption, Subheadline } from '../ui/Text';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import { CategoryManagementModal } from '../settings/CategoryManagementModal';

const { height } = Dimensions.get('window');

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const MACRO_LABELS = {
  needs: 'Necessidades',
  wants: 'Desejos',
  investments: 'Investimentos'
};

const parseCurrencyInput = (value) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  // Arredondar para 2 casas decimais para evitar problemas de precisão
  return Math.round(parsed * 100) / 100;
};

const formatCurrencyInput = (value) => {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? parseCurrencyInput(value) : value;
  if (num === 0) return '';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Componente OptionSheet para seleção de categorias
const CategoryOptionSheet = ({ visible, onClose, options = [], selectedId, onSelect }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={optionSheetStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={optionSheetStyles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={optionSheetStyles.header}>
            <Title2 weight="semiBold">Selecionar categoria</Title2>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={optionSheetStyles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.length === 0 ? (
              <Caption color="secondary" style={{ textAlign: 'center', padding: spacing[4] }}>
                Nenhuma categoria disponível
              </Caption>
            ) : (
              options.map((option) => {
                const isSelected = selectedId === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      optionSheetStyles.option,
                      isSelected && optionSheetStyles.optionSelected,
                    ]}
                    onPress={() => {
                      onSelect(option.id);
                      onClose();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Callout weight="medium">{option.name}</Callout>
                    </View>
                    {isSelected && (
                      <Check size={20} color={colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export function MacroEditModal({
  visible,
  onClose,
  macro,
  categories = [],
  selectedMonth,
  organization,
  onSave,
}) {
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  
  const [macroDraft, setMacroDraft] = useState([]);
  const [macroDraftTarget, setMacroDraftTarget] = useState(0);
  const [categoryToAdd, setCategoryToAdd] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (!visible || !macro) return;

    // Inicializar draft com categorias do macro
    const draft = (macro.categories || []).map((category) => ({
      id: category.id,
      categoryId: category.category_id || category.id,
      name: category.name,
      amount: Number(category.amount || 0),
      spent: Number(category.spent || 0),
      color: category.color || '#2563EB',
    }));
    
    setMacroDraft(draft);
    setMacroDraftTarget(Number(macro.totalBudget || 0));
    setCategoryToAdd('');
    setShowCategorySheet(false);
    setShowCategoryModal(false);
  }, [visible, macro]);

  const availableMacroCategories = useMemo(() => {
    if (!macro) return [];
    return categories
      .filter((category) => category.macro_group === macro.key)
      .filter((category) => !macroDraft.some((entry) => entry.categoryId === category.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [categories, macro, macroDraft]);

  const macroDraftTotal = useMemo(() => {
    const total = macroDraft.reduce((sum, entry) => {
      const amount = typeof entry.amount === 'string' ? parseCurrencyInput(entry.amount) : Number(entry.amount) || 0;
      return sum + amount;
    }, 0);
    // Garantir precisão: arredondar para 2 casas decimais
    return Math.round(total * 100) / 100;
  }, [macroDraft]);

  const targetValue = typeof macroDraftTarget === 'string' ? parseCurrencyInput(macroDraftTarget) : Number(macroDraftTarget) || 0;
  const macroDraftDiff = targetValue - macroDraftTotal;
  const macroDraftBalanced = Math.abs(macroDraftDiff) < 0.01;
  const macroDraftHasOverspend = macroDraft.some((entry) => {
    const amount = typeof entry.amount === 'string' ? parseCurrencyInput(entry.amount) : Number(entry.amount) || 0;
    return entry.spent > amount;
  });
  // Permitir salvar mesmo com diferença pequena ou overspend (apenas alertar)
  const canSave = macro && !saving && macroDraft.length > 0;

  const handleMacroTargetChange = (value) => {
    if (value === '' || value === null || value === undefined) {
      setMacroDraftTarget('');
      return;
    }
    const cleaned = value.replace(/[^\d,]/g, '');
    setMacroDraftTarget(cleaned);
  };

  const handleMacroTargetBlur = () => {
    const parsed = parseCurrencyInput(macroDraftTarget);
    // Garantir precisão: arredondar para 2 casas decimais
    const rounded = Math.round(parsed * 100) / 100;
    setMacroDraftTarget(Number.isFinite(rounded) && rounded >= 0 ? rounded : 0);
  };

  const handleMacroAmountChange = (index, value) => {
    if (value === '' || value === null || value === undefined) {
      setMacroDraft((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], amount: '' };
        return updated;
      });
      return;
    }
    // Remover tudo exceto números e vírgula
    let cleaned = value.replace(/[^\d,]/g, '');
    
    // Garantir apenas uma vírgula e limitar a 2 casas decimais
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      const beforeComma = cleaned.substring(0, commaIndex);
      const afterComma = cleaned.substring(commaIndex + 1).replace(/,/g, '').substring(0, 2);
      cleaned = beforeComma + (afterComma ? ',' + afterComma : '');
    }
    
    setMacroDraft((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: cleaned };
      return updated;
    });
  };

  const handleMacroAmountBlur = (index) => {
    setMacroDraft((prev) => {
      const updated = [...prev];
      const amount = typeof updated[index].amount === 'string' 
        ? parseCurrencyInput(updated[index].amount) 
        : Number(updated[index].amount) || 0;
      // Garantir precisão: arredondar para 2 casas decimais
      const finalAmount = Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0;
      updated[index] = { ...updated[index], amount: finalAmount };
      return updated;
    });
  };

  const handleRemoveMacroCategory = (index) => {
    setMacroDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMacroCategory = () => {
    if (!categoryToAdd) return;
    const category = categories.find((c) => c.id === categoryToAdd);
    if (!category) return;

    setMacroDraft((prev) => [
      ...prev,
      {
        id: null,
        categoryId: category.id,
        name: category.name,
        amount: 0,
        spent: 0,
        color: category.color || '#2563EB',
      },
    ]);
    setCategoryToAdd('');
  };

  const handleSave = async () => {
    if (!macro || !organization) return;
    
    // Avisar sobre diferença, mas permitir salvar
    if (!macroDraftBalanced) {
      if (macroDraftDiff > 0) {
        showToast(`Atenção: Faltam ${formatCurrency(macroDraftDiff)} para distribuir completamente.`, 'warning');
      } else {
        showToast(`Atenção: Excedeu ${formatCurrency(Math.abs(macroDraftDiff))} do valor planejado.`, 'warning');
      }
      // Continuar mesmo assim
    }
    
    // Avisar sobre overspend, mas permitir salvar
    if (macroDraftHasOverspend) {
      showToast('Atenção: Algumas categorias possuem gastos maiores do que o valor planejado.', 'warning');
      // Continuar mesmo assim
    }

    const monthYear = selectedMonth ? `${selectedMonth}-01` : null;
    if (!monthYear) {
      showToast('Mês selecionado inválido.', 'error');
      return;
    }

    const updates = [];
    const inserts = [];
    const deletes = [];

    const originalIds = (macro.categories || [])
      .map((category) => category.id)
      .filter(Boolean);

    macroDraft.forEach((entry) => {
      // Garantir precisão: arredondar para 2 casas decimais antes de salvar
      const rawAmount = typeof entry.amount === 'string' ? parseCurrencyInput(entry.amount) : Number(entry.amount || 0);
      const amount = Math.round(rawAmount * 100) / 100;
      if (amount <= 0) {
        if (entry.id) {
          deletes.push(entry.id);
        }
        return;
      }

      if (entry.id) {
        updates.push({ id: entry.id, amount });
      } else {
        inserts.push({
          organization_id: organization.id,
          category_id: entry.categoryId,
          limit_amount: amount,
          month_year: monthYear,
        });
      }
    });

    originalIds.forEach((id) => {
      if (!macroDraft.some((entry) => entry.id === id && entry.amount > 0)) {
        deletes.push(id);
      }
    });

    setSaving(true);
    try {
      if (deletes.length) {
        await supabase.from('budgets').delete().in('id', deletes);
      }

      if (updates.length) {
        await Promise.all(
          updates.map((entry) =>
            supabase.from('budgets').update({ limit_amount: entry.amount }).eq('id', entry.id)
          )
        );
      }

      if (inserts.length) {
        await supabase.from('budgets').insert(inserts);
      }

      showToast('Macro atualizada com sucesso!', 'success');
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar macro:', error);
      showToast('Erro ao salvar macro: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !macro) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing[3]) }]}>
            <View style={styles.headerLeft}>
              <Title2>Editar macro · {MACRO_LABELS[macro.key]}</Title2>
              <Caption color="secondary">
                Ajuste o valor total e distribua entre as categorias vinculadas a esta macro.
              </Caption>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Stats */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScrollContainer}
            >
              <View style={styles.statCard}>
                <Caption color="secondary" style={styles.statLabel}>Valor planejado</Caption>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                  {formatCurrency(macroDraftTarget)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Caption color="secondary" style={styles.statLabel}>Distribuído</Caption>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                  {formatCurrency(macroDraftTotal)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Caption color="secondary" style={styles.statLabel}>Diferença</Caption>
                <Text 
                  style={[styles.statValue, { color: macroDraftDiff < 0 ? colors.error.main : colors.success.main }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {formatCurrency(macroDraftDiff)}
                </Text>
              </View>
            </ScrollView>

            {/* Target Input */}
            <View style={styles.section}>
              <Subheadline weight="semiBold" style={styles.sectionTitle}>
                Ajustar valor total planejado
              </Subheadline>
              <View style={styles.currencyInput}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={styles.targetInput}
                  value={typeof macroDraftTarget === 'number' ? formatCurrencyInput(macroDraftTarget) : macroDraftTarget}
                  onChangeText={handleMacroTargetChange}
                  onBlur={handleMacroTargetBlur}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Categories */}
            {macroDraft.length > 0 ? (
              <View style={styles.section}>
                <Subheadline weight="semiBold" style={styles.sectionTitle}>
                  Categorias
                </Subheadline>
                {macroDraft.map((entry, index) => {
                  const amount = typeof entry.amount === 'string' ? parseCurrencyInput(entry.amount) : Number(entry.amount) || 0;
                  const hasOverspend = entry.spent > amount;

                  return (
                    <View key={`${entry.categoryId}-${index}`} style={styles.categoryCard}>
                      <View style={styles.categoryHeader}>
                        <View style={[styles.categoryIcon, { borderColor: entry.color }]}>
                          <Text style={[styles.categoryIconText, { color: entry.color }]}>
                            {entry.name[0]?.toUpperCase() || 'C'}
                          </Text>
                        </View>
                        <View style={styles.categoryInfo}>
                          <Subheadline weight="semiBold">{entry.name}</Subheadline>
                          <Caption color="secondary">Já gasto: {formatCurrency(entry.spent)}</Caption>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveMacroCategory(index)}
                          style={styles.removeButton}
                        >
                          <Trash2 size={18} color={colors.error.main} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.categoryInputSection}>
                        <Caption color="secondary" style={styles.inputLabel}>Valor planejado</Caption>
                        <View style={styles.currencyInput}>
                          <Text style={styles.currencySymbol}>R$</Text>
                          <TextInput
                            style={styles.categoryInput}
                            value={typeof entry.amount === 'number' ? formatCurrencyInput(entry.amount) : (entry.amount || '')}
                            onChangeText={(text) => handleMacroAmountChange(index, text)}
                            onBlur={() => handleMacroAmountBlur(index)}
                            placeholder="0,00"
                            keyboardType="numeric"
                          />
                        </View>
                        {hasOverspend && (
                          <View style={styles.warningBox}>
                            <AlertTriangle size={14} color={colors.error.main} />
                            <Caption style={styles.warningText}>
                              Valor menor que o já gasto. Ajuste para pelo menos {formatCurrency(entry.spent)}.
                            </Caption>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Caption color="secondary" style={styles.emptyStateText}>
                  Nenhuma categoria adicionada ainda. Utilize o seletor abaixo para incluir novas categorias nesta macro.
                </Caption>
              </View>
            )}

            {/* Add Category */}
            <View style={styles.section}>
              <Subheadline weight="semiBold" style={styles.sectionTitle}>
                Adicionar categoria
              </Subheadline>
              {availableMacroCategories.length > 0 ? (
                <View style={styles.addCategoryContainer}>
                  <TouchableOpacity
                    style={styles.categorySelect}
                    onPress={() => setShowCategorySheet(true)}
                  >
                    <Caption color="secondary" style={{ flex: 1 }}>
                      {categoryToAdd ? categories.find(c => c.id === categoryToAdd)?.name : 'Adicionar categoria existente...'}
                    </Caption>
                    <ChevronDown size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                  <Button
                    title="Adicionar"
                    variant="ghost"
                    size="sm"
                    onPress={handleAddMacroCategory}
                    disabled={!categoryToAdd}
                  />
                </View>
              ) : (
                <Caption color="secondary" style={{ marginBottom: spacing[2] }}>
                  Todas as categorias dessa macro já estão presentes neste planejamento.
                </Caption>
              )}
              <Button
                title="Criar nova categoria"
                variant="outline"
                size="sm"
                onPress={() => setShowCategoryModal(true)}
                style={{ marginTop: spacing[2] }}
              />
            </View>

            {/* Status Message */}
            <View style={[
              styles.statusBox,
              macroDraftBalanced ? styles.statusBoxSuccess : 
              macroDraftDiff > 0 ? styles.statusBoxWarning : styles.statusBoxError
            ]}>
              <Caption style={styles.statusText}>
                {macroDraftBalanced
                  ? 'Distribuição fechada em 100% do valor planejado.'
                  : macroDraftDiff > 0
                  ? `Faltam ${formatCurrency(Math.abs(macroDraftDiff))} para distribuir.`
                  : `Excedeu ${formatCurrency(Math.abs(macroDraftDiff))} do valor planejado.`}
              </Caption>
            </View>

          {macroDraftHasOverspend && (
            <View style={styles.warningBox}>
              <AlertTriangle size={16} color={colors.warning.main} />
              <Caption style={styles.warningText}>
                Algumas categorias possuem gastos maiores do que o valor planejado. Considere ajustar os valores.
              </Caption>
            </View>
          )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[3]), paddingTop: spacing[3] }]}>
            <Button variant="outline" title="Cancelar" onPress={onClose} disabled={saving} style={styles.footerButton} />
            <Button title={saving ? 'Salvando...' : 'Salvar'} onPress={handleSave} disabled={!canSave} style={styles.footerButton} />
          </View>
        </View>
      </View>

      {/* Category Selection Sheet */}
      <CategoryOptionSheet
        visible={showCategorySheet}
        onClose={() => setShowCategorySheet(false)}
        options={availableMacroCategories.map(cat => ({ id: cat.id, name: cat.name }))}
        selectedId={categoryToAdd}
        onSelect={(categoryId) => setCategoryToAdd(categoryId)}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        organization={organization}
      />
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
    width: '90%',
    maxWidth: 600,
    height: height * 0.85,
    borderRadius: radius.xl,
    ...shadows.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    flexShrink: 0,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing[2],
  },
  closeButton: {
    padding: spacing[1],
  },
  scrollContent: {
    flex: 1,
    minHeight: 0,
  },
  scrollContentContainer: {
    padding: spacing[4],
    flexGrow: 1,
  },
  statsScrollContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[4],
    marginBottom: spacing[4],
  },
  statCard: {
    width: 140,
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
    flexShrink: 0,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing[0.5],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[2],
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    backgroundColor: colors.background.secondary,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginRight: spacing[1],
  },
  targetInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'right',
    padding: spacing[2],
  },
  categoryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  categoryIconText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryInfo: {
    flex: 1,
  },
  removeButton: {
    padding: spacing[1],
  },
  categoryInputSection: {
    marginTop: spacing[2],
  },
  inputLabel: {
    marginBottom: spacing[1],
  },
  categoryInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'right',
    padding: spacing[2],
  },
  emptyState: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emptyStateText: {
    textAlign: 'center',
  },
  addCategoryContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  categorySelect: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
  },
  statusBox: {
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  statusBoxSuccess: {
    backgroundColor: colors.success.bg,
    borderWidth: 1,
    borderColor: colors.success.main,
  },
  statusBoxWarning: {
    backgroundColor: colors.warning.bg,
    borderWidth: 1,
    borderColor: colors.warning.main,
  },
  statusBoxError: {
    backgroundColor: colors.error.bg,
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  statusText: {
    color: colors.text.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  warningText: {
    flex: 1,
    color: colors.error.main,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    flexShrink: 0,
  },
  footerButton: {
    flex: 1,
  },
});

const optionSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: height * 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  content: {
    maxHeight: height * 0.6,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  optionSelected: {
    backgroundColor: colors.brand.bg,
  },
});

