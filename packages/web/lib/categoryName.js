import { t } from '@fintrack/shared/i18n';

// Default categories are stored in the database with Portuguese names.
// Map them to translation keys so the dashboard shows them in the user's
// language. Custom categories (anything not listed here) are shown as typed.
const KEY_BY_NAME = {
  alimentacao: 'food',
  mercado: 'groceries',
  supermercado: 'groceries',
  restaurante: 'restaurants',
  restaurantes: 'restaurants',
  transporte: 'transport',
  combustivel: 'fuel',
  saude: 'health',
  farmacia: 'pharmacy',
  lazer: 'leisure',
  entretenimento: 'entertainment',
  contas: 'bills',
  casa: 'home',
  moradia: 'housing',
  aluguel: 'rent',
  educacao: 'education',
  investimentos: 'investments',
  investimento: 'investments',
  outros: 'other',
  outro: 'other',
  pets: 'pets',
  pet: 'pets',
  assinaturas: 'subscriptions',
  viagens: 'travel',
  viagem: 'travel',
  roupas: 'clothing',
  vestuario: 'clothing',
  compras: 'shopping',
  academia: 'gym',
  filhos: 'kids',
  presente: 'gifts',
  presentes: 'gifts',
  salario: 'salary',
  freelance: 'freelance',
  vendas: 'sales',
  bonificacao: 'bonus',
  transferencia: 'transfer',
  renda: 'income',
  'sem categoria': 'uncategorized',
};

function normalize(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function categoryKey(name) {
  if (!name) return null;
  return KEY_BY_NAME[normalize(name)] || null;
}

// Display name for a category name as stored in the database.
export function categoryName(name) {
  const key = categoryKey(name);
  return key ? t(`web.categories.${key}`) : name;
}

export default categoryName;
