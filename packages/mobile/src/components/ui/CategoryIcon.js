import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ForkKnife } from 'phosphor-react-native/lib/module/icons/ForkKnife';
import { Car } from 'phosphor-react-native/lib/module/icons/Car';
import { House } from 'phosphor-react-native/lib/module/icons/House';
import { Heartbeat } from 'phosphor-react-native/lib/module/icons/Heartbeat';
import { GameController } from 'phosphor-react-native/lib/module/icons/GameController';
import { GraduationCap } from 'phosphor-react-native/lib/module/icons/GraduationCap';
import { TShirt } from 'phosphor-react-native/lib/module/icons/TShirt';
import { ShoppingCart } from 'phosphor-react-native/lib/module/icons/ShoppingCart';
import { DeviceMobile } from 'phosphor-react-native/lib/module/icons/DeviceMobile';
import { Lightning } from 'phosphor-react-native/lib/module/icons/Lightning';
import { Money } from 'phosphor-react-native/lib/module/icons/Money';
import { Gift } from 'phosphor-react-native/lib/module/icons/Gift';
import { Briefcase } from 'phosphor-react-native/lib/module/icons/Briefcase';
import { FilmStrip } from 'phosphor-react-native/lib/module/icons/FilmStrip';
import { Coffee } from 'phosphor-react-native/lib/module/icons/Coffee';
import { PawPrint } from 'phosphor-react-native/lib/module/icons/PawPrint';
import { Barbell } from 'phosphor-react-native/lib/module/icons/Barbell';
import { Airplane } from 'phosphor-react-native/lib/module/icons/Airplane';
import { Baby } from 'phosphor-react-native/lib/module/icons/Baby';
import { Pill } from 'phosphor-react-native/lib/module/icons/Pill';
import { Drop } from 'phosphor-react-native/lib/module/icons/Drop';
import { CreditCard } from 'phosphor-react-native/lib/module/icons/CreditCard';
import { Bank } from 'phosphor-react-native/lib/module/icons/Bank';
import { Wallet } from 'phosphor-react-native/lib/module/icons/Wallet';
import { Question } from 'phosphor-react-native/lib/module/icons/Question';
import { ArrowDown } from 'phosphor-react-native/lib/module/icons/ArrowDown';
import { ArrowUp } from 'phosphor-react-native/lib/module/icons/ArrowUp';
import { Receipt } from 'phosphor-react-native/lib/module/icons/Receipt';
import { Storefront } from 'phosphor-react-native/lib/module/icons/Storefront';
import { WifiHigh } from 'phosphor-react-native/lib/module/icons/WifiHigh';
import { Wrench } from 'phosphor-react-native/lib/module/icons/Wrench';
import { BookOpen } from 'phosphor-react-native/lib/module/icons/BookOpen';
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
