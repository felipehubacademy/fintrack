import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { X, Tag, Plus, Edit, Trash2 } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { useConfirmation } from '../ui/ConfirmationProvider';
import { supabase } from '../../services/supabase';
import { HapticFeedback } from '../../utils/haptics';
import { useI18n } from '../../contexts/I18nContext';
import { categoryLabel } from '../../utils/categoryLabel';

const { height } = Dimensions.get('window');

const MACRO_OPTIONS = ['needs', 'wants', 'investments'];

const COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#06B6D4', '#8B5A2B', '#6B7280', '#F97316'
];

export function CategoryManagementModal({ visible, onClose, organization }) {
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expense');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    macro_group: 'needs',
  });

  useEffect(() => {
    if (visible && organization) {
      fetchCategories();
    }
  }, [visible, organization, activeTab]);

  const fetchCategories = async () => {
    try {
      setLoading(true);

      const { data: globalsData, error: globalsError } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`type.eq.${activeTab},type.eq.both`)
        .is('organization_id', null)
        .order('name');

      const { data: orgData, error: orgError } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`type.eq.${activeTab},type.eq.both`)
        .eq('organization_id', organization.id)
        .order('name');

      if (globalsError || orgError) throw globalsError || orgError;

      setCategories([...(globalsData || []), ...(orgData || [])]);
    } catch (error) {
      console.error('Failed to load categories:', error);
      showToast(t('settings.categoryManager.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      HapticFeedback.warning();
      showToast(t('settings.categoryManager.nameRequired'), 'warning');
      return;
    }

    try {
      HapticFeedback.medium();
      if (editingCategory) {
        const { error } = await supabase
          .from('budget_categories')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color,
            macro_group: formData.macro_group,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        HapticFeedback.success();
        showToast(t('settings.categoryManager.updated'), 'success');
      } else {
        const { error } = await supabase
          .from('budget_categories')
          .insert({
            organization_id: organization.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color,
            type: activeTab,
            macro_group: formData.macro_group,
            is_default: false,
          });

        if (error) throw error;
        HapticFeedback.success();
        showToast(t('settings.categoryManager.created'), 'success');
      }

      await fetchCategories();
      resetForm();
    } catch (error) {
      console.error('Failed to save category:', error);
      showToast(t('settings.categoryManager.saveError'), 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6366F1',
      macro_group: 'needs',
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category) => {
    if (category.is_default) {
      HapticFeedback.warning();
      showToast(t('settings.categoryManager.defaultNoEdit'), 'warning');
      return;
    }
    HapticFeedback.light();
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#6366F1',
      macro_group: category.macro_group || 'needs',
    });
    setShowForm(true);
  };

  const handleDelete = async (category) => {
    if (category.is_default) {
      showToast(t('settings.categoryManager.defaultNoDelete'), 'warning');
      return;
    }

    try {
      await confirm({
        title: t('settings.categoryManager.deleteTitle'),
        message: t('settings.categoryManager.deleteMessage', { name: categoryLabel(category.name) }),
        type: 'danger',
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        onConfirm: async () => {
          const { error } = await supabase
            .from('budget_categories')
            .delete()
            .eq('id', category.id);

          if (error) throw error;

          showToast(t('settings.categoryManager.deleted'), 'success');
          await fetchCategories();
        },
      });
    } catch (error) {
      // cancelled
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, { paddingTop: insets.top || spacing[4], paddingBottom: Math.max(insets.bottom, spacing[3]) }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.modal,
            { maxHeight: Math.min(height * 0.85, height - (insets.top + insets.bottom) - spacing[6]) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="bold">{t('settings.categoryManager.title')}</Title2>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'expense' && styles.tabActive]}
              onPress={() => {
                setActiveTab('expense');
                resetForm();
              }}
            >
              <Caption weight={activeTab === 'expense' ? 'semiBold' : 'regular'}>
                {t('settings.categoryManager.tabs.expense')}
              </Caption>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'income' && styles.tabActive]}
              onPress={() => {
                setActiveTab('income');
                resetForm();
              }}
            >
              <Caption weight={activeTab === 'income' ? 'semiBold' : 'regular'}>
                {t('settings.categoryManager.tabs.income')}
              </Caption>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Caption color="secondary">{t('settings.categoryManager.loading')}</Caption>
              </View>
            ) : (
              <>
                {/* Form */}
                {showForm ? (
                  <View style={styles.form}>
                    <Input
                      label={`${t('settings.categoryManager.nameLabel')} *`}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder={t('settings.categoryManager.namePlaceholder')}
                      accessibilityLabel={t('settings.categoryManager.namePlaceholder')}
                    />
                    <Input
                      label={t('settings.categoryManager.descriptionLabel')}
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      placeholder={t('settings.categoryManager.descriptionPlaceholder')}
                      multiline
                      accessibilityLabel={t('settings.categoryManager.descriptionA11y')}
                    />
                    
                    {/* Color picker */}
                    <View style={styles.field}>
                      <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1.5] }}>
                        {t('settings.categoryManager.color')}
                      </Caption>
                      <View style={styles.colorGrid}>
                        {COLORS.map((color) => (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.colorOption,
                              { backgroundColor: color },
                              formData.color === color && styles.colorOptionSelected,
                            ]}
                            onPress={() => {
                              HapticFeedback.selection();
                              setFormData({ ...formData, color });
                            }}
                          >
                            {formData.color === color && (
                              <View style={styles.colorCheck}>
                                <X size={12} color={colors.neutral[0]} />
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    {activeTab === 'expense' && (
                      <View style={styles.field}>
                        <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                          {t('settings.categoryManager.group')}
                        </Caption>
                        <View style={styles.macroOptions}>
                          {MACRO_OPTIONS.map((value) => (
                            <TouchableOpacity
                              key={value}
                              style={[
                                styles.macroOption,
                                formData.macro_group === value && styles.macroOptionActive,
                              ]}
                              onPress={() => {
                                HapticFeedback.selection();
                                setFormData({ ...formData, macro_group: value });
                              }}
                              accessibilityRole="button"
                              accessibilityState={{ selected: formData.macro_group === value }}
                            >
                              <Caption weight={formData.macro_group === value ? 'semiBold' : 'regular'}>
                                {t(`settings.categoryManager.macro.${value}`)}
                              </Caption>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <View style={styles.formActions}>
                      <Button
                        title={t('common.cancel')}
                        variant="outline"
                        onPress={resetForm}
                        style={{ flex: 1, marginRight: spacing[2] }}
                      />
                      <Button
                        title={editingCategory ? t('common.save') : t('settings.categoryManager.create')}
                        onPress={handleSubmit}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ) : (
                  <Button
                    title={t('settings.categoryManager.newCategory')}
                    onPress={() => {
                      HapticFeedback.light();
                      setShowForm(true);
                    }}
                    icon={<Plus size={20} color={colors.neutral[0]} />}
                    style={{ marginBottom: spacing[3] }}
                  />
                )}

                {/* Categories List */}
                <View style={styles.section}>
                  {categories.map((category) => (
                    <View key={category.id} style={styles.categoryItem}>
                      <View style={[styles.colorDot, { backgroundColor: category.color || '#6366F1' }]} />
                      <View style={styles.categoryInfo}>
                        <Callout weight="medium">{categoryLabel(category.name)}</Callout>
                        {category.description && (
                          <Caption color="secondary">{category.description}</Caption>
                        )}
                        {MACRO_OPTIONS.includes(category.macro_group) && (
                          <Caption color="tertiary" style={{ marginTop: spacing[0.5] }}>
                            {t(`settings.categoryManager.macro.${category.macro_group}`)}
                          </Caption>
                        )}
                      </View>
                      {!category.is_default && (
                        <View style={styles.categoryActions}>
                          <TouchableOpacity
                            onPress={() => handleEdit(category)}
                            style={styles.actionButton}
                            accessibilityRole="button"
                            accessibilityLabel={t('settings.categoryManager.edit', { name: categoryLabel(category.name) })}
                          >
                            <Edit size={18} color={colors.text.secondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDelete(category)}
                            style={styles.actionButton}
                            accessibilityRole="button"
                            accessibilityLabel={t('settings.categoryManager.delete', { name: categoryLabel(category.name) })}
                          >
                            <Trash2 size={18} color={colors.error.main} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
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
    flexDirection: 'column',
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    padding: spacing[2],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.brand.primary,
  },
  content: {
    flex: 1,
    minHeight: 200,
  },
  contentContainer: {
    padding: spacing[3],
    flexGrow: 1,
  },
  loadingContainer: {
    padding: spacing[4],
    alignItems: 'center',
  },
  form: {
    marginBottom: spacing[3],
  },
  field: {
    marginTop: spacing[2],
  },
  macroOptions: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  macroOption: {
    flex: 1,
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  macroOptionActive: {
    backgroundColor: colors.brand.bg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  formActions: {
    flexDirection: 'row',
    marginTop: spacing[2],
  },
  section: {
    marginTop: spacing[2],
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    marginBottom: spacing[1],
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing[2],
  },
  categoryInfo: {
    flex: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  actionButton: {
    padding: spacing[1],
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderColor: colors.text.primary,
    borderWidth: 3,
  },
  colorCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

