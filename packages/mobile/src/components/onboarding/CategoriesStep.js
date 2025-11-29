import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Tag, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';
import { useToast } from '../ui/Toast';

const defaultCategories = [
  { name: 'Alimentação', color: '#EF4444' },
  { name: 'Transporte', color: '#3B82F6' },
  { name: 'Saúde', color: '#10B981' },
  { name: 'Lazer', color: '#8B5CF6' },
  { name: 'Contas', color: '#F59E0B' },
  { name: 'Casa', color: '#06B6D4' },
  { name: 'Educação', color: '#84CC16' },
  { name: 'Investimentos', color: '#EC4899' },
  { name: 'Outros', color: '#6B7280' }
];

export default function CategoriesStep({ organization, onComplete, onDataChange, onboardingType }) {
  const { showToast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const isInvited = onboardingType === 'invited';

  const toggleCategory = (categoryName) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const handleComplete = async () => {
    if (selectedCategories.size === 0) {
      // Permitir pular sem selecionar
      if (onComplete) onComplete();
      return;
    }

    setLoading(true);
    try {
      // Criar categorias selecionadas
      const categoriesToCreate = defaultCategories.filter(cat => selectedCategories.has(cat.name));
      
      if (categoriesToCreate.length > 0) {
        const { error } = await supabase
          .from('budget_categories')
          .insert(
            categoriesToCreate.map(cat => ({
              organization_id: organization.id,
              name: cat.name,
              color: cat.color,
              type: 'expense',
              macro_group: 'needs',
              is_default: false,
            }))
          );

        if (error) throw error;
      }

      if (onDataChange) {
        onDataChange({ categories_created: categoriesToCreate.length });
      }

      showToast(`${categoriesToCreate.length} categorias criadas!`, 'success');
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Erro ao criar categorias:', error);
      showToast('Erro ao criar categorias', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Tag size={64} color={colors.brand.primary} />
        </View>

        <Title2 style={styles.title}>
          Escolha suas categorias
        </Title2>

        <Text style={styles.description}>
          Selecione as categorias que você mais usa para organizar seus gastos
        </Text>

        <View style={styles.categoriesGrid}>
          {defaultCategories.map((category) => {
            const isSelected = selectedCategories.has(category.name);
            return (
              <TouchableOpacity
                key={category.name}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected,
                  { borderColor: category.color }
                ]}
                onPress={() => toggleCategory(category.name)}
              >
                <View style={[styles.colorDot, { backgroundColor: category.color }]} />
                <Text style={styles.categoryName}>{category.name}</Text>
                {isSelected && (
                  <View style={styles.checkContainer}>
                    <Check size={16} color={colors.neutral[0]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Caption style={styles.hint}>
          Você pode adicionar mais categorias depois nas configurações
        </Caption>

        <Button
          title={selectedCategories.size === 0 ? "Pular" : `Criar ${selectedCategories.size} categoria(s)`}
          onPress={handleComplete}
          loading={loading}
          style={styles.button}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  description: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  categoryCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
    marginBottom: spacing[2],
  },
  categoryCardSelected: {
    backgroundColor: colors.brand.bg,
    borderWidth: 2,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[2],
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  checkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    color: colors.text.tertiary,
    marginBottom: spacing[4],
  },
  button: {
    marginTop: spacing[2],
  },
});

