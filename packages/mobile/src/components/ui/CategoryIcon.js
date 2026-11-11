import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  ForkKnife,
  Car,
  House,
  Heartbeat,
  GameController,
  GraduationCap,
  TShirt,
  ShoppingCart,
  DeviceMobile,
  Lightning,
  Money,
  Gift,
  Briefcase,
  FilmStrip,
  Coffee,
  PawPrint,
  Barbell,
  Airplane,
  Baby,
  Pill,
  Drop,
  CreditCard,
  Bank,
  Wallet,
  Question,
  ArrowDown,
  ArrowUp,
  Receipt,
  Storefront,
  WifiHigh,
  Wrench,
  BookOpen,
} from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORY_MAP = {
  'Alimentação': { icon: ForkKnife, color: '#EF4444' },
  'Mercado': { icon: ShoppingCart, color: '#EF4444' },
  'Restaurante': { icon: ForkKnife, color: '#F97316' },
  'Café': { icon: Coffee, color: '#92400E' },
  'Transporte': { icon: Car, color: '#F97316' },
  'Combustível': { icon: Drop, color: '#F97316' },
  'Moradia': { icon: House, color: '#3B82F6' },
  'Aluguel': { icon: House, color: '#3B82F6' },
  'Saúde': { icon: Heartbeat, color: '#22C55E' },
  'Farmácia': { icon: Pill, color: '#22C55E' },
  'Lazer': { icon: GameController, color: '#A855F7' },
  'Entretenimento': { icon: FilmStrip, color: '#A855F7' },
  'Streaming': { icon: FilmStrip, color: '#7C3AED' },
  'Educação': { icon: GraduationCap, color: '#10B981' },
  'Vestuário': { icon: TShirt, color: '#D946EF' },
  'Compras': { icon: ShoppingCart, color: '#F59E0B' },
  'Assinaturas': { icon: DeviceMobile, color: '#0EA5E9' },
  'Internet': { icon: WifiHigh, color: '#0EA5E9' },
  'Contas': { icon: Lightning, color: '#EAB308' },
  'Água': { icon: Drop, color: '#06B6D4' },
  'Luz': { icon: Lightning, color: '#EAB308' },
  'Salário': { icon: Money, color: '#10B981' },
  'Renda': { icon: Money, color: '#10B981' },
  'Renda Extra': { icon: Wallet, color: '#059669' },
  'Freelance': { icon: Briefcase, color: '#059669' },
  'Presente': { icon: Gift, color: '#EC4899' },
  'Trabalho': { icon: Briefcase, color: '#64748B' },
  'Pet': { icon: PawPrint, color: '#F97316' },
  'Academia': { icon: Barbell, color: '#6366F1' },
  'Viagem': { icon: Airplane, color: '#0EA5E9' },
  'Filhos': { icon: Baby, color: '#F472B6' },
  'Cartão': { icon: CreditCard, color: '#6366F1' },
  'Banco': { icon: Bank, color: '#1E40AF' },
  'Manutenção': { icon: Wrench, color: '#78716C' },
  'Livros': { icon: BookOpen, color: '#7C3AED' },
  'Investimento': { icon: ArrowUp, color: '#10B981' },
  'Outros': { icon: Receipt, color: '#737373' },
};

const DEFAULT_CONFIG = { icon: Question, color: '#737373' };

export function CategoryIcon({ category, size = 40, iconSize = 20 }) {
  const { isDark } = useTheme();
  const config = CATEGORY_MAP[category] || DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: isDark ? `${config.color}18` : `${config.color}12`,
      },
    ]}>
      <Icon
        size={iconSize}
        color={config.color}
        weight="duotone"
      />
    </View>
  );
}

export function getCategoryColor(category) {
  return (CATEGORY_MAP[category] || DEFAULT_CONFIG).color;
}

export const CATEGORIES = Object.keys(CATEGORY_MAP);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
