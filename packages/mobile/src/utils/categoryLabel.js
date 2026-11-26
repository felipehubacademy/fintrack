// Category names for display.
//
// The database stores the default categories with their Portuguese names
// ('Alimentação', 'Transporte', 'Outros'...; see docs/FRESH_DATABASE_SETUP.sql
// and docs/migrations/add-is-default-to-categories.sql). This maps those
// known defaults to keys in the `categories` namespace, which hold a name
// adapted to each market (e.g. Feira -> "Farmers market" / "Tianguis").
// Names users created themselves are returned unchanged.
import { t as translate } from '@fintrack/shared/i18n';

// normalized Portuguese name -> key in the `categories` namespace
const DEFAULT_CATEGORY_KEYS = {
  // Expense defaults
  alimentacao: 'food',
  transporte: 'transport',
  saude: 'health',
  lazer: 'leisure',
  contas: 'bills',
  casa: 'home',
  moradia: 'housing',
  educacao: 'education',
  investimentos: 'investments',
  investimento: 'investments',
  outros: 'other',
  // Common extras (icons exist for these in CategoryIcon)
  mercado: 'groceries',
  supermercado: 'groceries',
  feira: 'farmersMarket',
  restaurante: 'restaurants',
  restaurantes: 'restaurants',
  cafe: 'coffee',
  delivery: 'delivery',
  combustivel: 'fuel',
  aluguel: 'rent',
  farmacia: 'pharmacy',
  entretenimento: 'entertainment',
  streaming: 'streaming',
  vestuario: 'clothing',
  roupas: 'clothing',
  compras: 'shopping',
  assinaturas: 'subscriptions',
  internet: 'internet',
  agua: 'water',
  luz: 'electricity',
  energia: 'electricity',
  pet: 'pets',
  pets: 'pets',
  academia: 'gym',
  viagem: 'travel',
  viagens: 'travel',
  filhos: 'kids',
  cartao: 'card',
  banco: 'bank',
  manutencao: 'maintenance',
  livros: 'books',
  beleza: 'beauty',
  impostos: 'taxes',
  presente: 'gifts',
  presentes: 'gifts',
  trabalho: 'work',
  // Income defaults
  salario: 'salary',
  freelance: 'freelance',
  'investimentos (retorno)': 'investmentReturns',
  vendas: 'sales',
  'aluguel recebido': 'rentReceived',
  bonificacao: 'bonus',
  transferencia: 'transfer',
  renda: 'income',
  'renda extra': 'extraIncome',
  // Placeholder used when a transaction has no category
  'sem categoria': 'uncategorized',
};

export function normalizeCategoryName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Key in the `categories` namespace for a known default name, else null. */
export function categoryKey(name) {
  const key = DEFAULT_CATEGORY_KEYS[normalizeCategoryName(name)];
  return key || null;
}

/**
 * Display name for a category in the user's language.
 * categoryLabel('Alimentação') -> 'Food' (en) / 'Alimentação' (pt) / 'Comida' (es)
 * categoryLabel('Padaria do Zé') -> 'Padaria do Zé'
 * categoryLabel(null) -> 'Uncategorized'
 * Pass the hook's t() so the label re-renders on language change.
 */
export function categoryLabel(name, t = translate) {
  if (!name || !String(name).trim()) return t('categories.uncategorized');
  const key = categoryKey(name);
  if (!key) return String(name);
  const label = t(`categories.${key}`);
  return label === `categories.${key}` ? String(name) : label;
}

export const DEFAULT_CATEGORY_NAMES = Object.keys(DEFAULT_CATEGORY_KEYS);
