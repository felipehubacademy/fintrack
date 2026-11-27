import { TrendingUp, Briefcase, Landmark, BarChart3, Bitcoin, Building2, Wallet } from 'lucide-react-native';

// Investment kinds the app knows about. Labels come from the
// `investments.types.<value>` keys so they follow the user's language.
export const INVESTMENT_TYPES = [
  { value: 'stocks', Icon: TrendingUp, color: '#10B981' },
  { value: 'funds', Icon: Briefcase, color: '#6366F1' },
  { value: 'treasury', Icon: Landmark, color: '#1A6AFF' },
  { value: 'fixed_income', Icon: BarChart3, color: '#F59E0B' },
  { value: 'crypto', Icon: Bitcoin, color: '#F97316' },
  { value: 'real_estate', Icon: Building2, color: '#0EA5E9' },
  { value: 'other', Icon: Wallet, color: '#78716C' },
];

// Types offered when creating an investment (real estate is display-only, for older rows).
export const SELECTABLE_INVESTMENT_TYPES = INVESTMENT_TYPES.filter((type) => type.value !== 'real_estate');

export function investmentTypeInfo(value) {
  return INVESTMENT_TYPES.find((type) => type.value === value) || INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1];
}

export function investmentTypeLabel(value, t) {
  return t(`investments.types.${investmentTypeInfo(value).value}`);
}
