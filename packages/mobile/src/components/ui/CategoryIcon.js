import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Heart,
  Gamepad2,
  GraduationCap,
  Shirt,
  Smartphone,
  Zap,
  Banknote,
  Gift,
  Briefcase,
  HelpCircle,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORY_MAP = {
  'Alimentação': { icon: Utensils, bg: '#FEF2F2', color: '#EF4444' },
  'Transporte': { icon: Car, bg: '#FFF7ED', color: '#F97316' },
  'Moradia': { icon: Home, bg: '#EFF6FF', color: '#3B82F6' },
  'Saúde': { icon: Heart, bg: '#F0FDF4', color: '#22C55E' },
  'Lazer': { icon: Gamepad2, bg: '#FAF5FF', color: '#A855F7' },
  'Educação': { icon: GraduationCap, bg: '#ECFDF5', color: '#10B981' },
  'Vestuário': { icon: Shirt, bg: '#FDF4FF', color: '#D946EF' },
  'Compras': { icon: ShoppingCart, bg: '#FFFBEB', color: '#F59E0B' },
  'Assinaturas': { icon: Smartphone, bg: '#F0F9FF', color: '#0EA5E9' },
  'Contas': { icon: Zap, bg: '#FEFCE8', color: '#EAB308' },
  'Salário': { icon: Banknote, bg: '#ECFDF5', color: '#10B981' },
  'Presente': { icon: Gift, bg: '#FDF2F8', color: '#EC4899' },
  'Trabalho': { icon: Briefcase, bg: '#F8FAFC', color: '#64748B' },
};

export function CategoryIcon({ category, size = 40, iconSize = 20 }) {
  const { isDark } = useTheme();
  const config = CATEGORY_MAP[category] || {
    icon: HelpCircle,
    bg: '#F5F5F5',
    color: '#737373',
  };
  const Icon = config.icon;

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isDark ? `${config.color}20` : config.bg,
      },
    ]}>
      <Icon size={iconSize} color={config.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
