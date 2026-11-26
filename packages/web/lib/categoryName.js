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
  beleza: 'beauty',
  // English and Spanish rows Zul may create per organization
  food: 'food', comida: 'food', alimentacion: 'food', alimentos: 'food',
  groceries: 'groceries', grocery: 'groceries',
  'eating out': 'restaurants', restaurants: 'restaurants',
  transport: 'transport', transportation: 'transport',
  fuel: 'fuel', gas: 'fuel', gasolina: 'fuel', combustible: 'fuel',
  health: 'health', salud: 'health',
  pharmacy: 'pharmacy',
  leisure: 'leisure', fun: 'leisure', ocio: 'leisure', entretenimiento: 'entertainment', entertainment: 'entertainment',
  bills: 'bills', utilities: 'bills', cuentas: 'bills', servicios: 'bills',
  home: 'home', hogar: 'home', housing: 'housing', vivienda: 'housing',
  rent: 'rent', alquiler: 'rent', arriendo: 'rent',
  education: 'education',
  investments: 'investments', inversiones: 'investments', inversion: 'investments', savings: 'investments',
  other: 'other', others: 'other', otros: 'other',
  mascotas: 'pets', subscriptions: 'subscriptions', suscripciones: 'subscriptions',
  travel: 'travel', viajes: 'travel', viaje: 'travel',
  clothing: 'clothing', clothes: 'clothing', ropa: 'clothing',
  shopping: 'shopping', gym: 'gym', gimnasio: 'gym', kids: 'kids', hijos: 'kids',
  gifts: 'gifts', regalos: 'gifts', salary: 'salary', sueldo: 'salary',
  sales: 'sales', ventas: 'sales', bonus: 'bonus', bono: 'bonus',
  transfer: 'transfer', income: 'income', ingresos: 'income',
  beauty: 'beauty', belleza: 'beauty',
  'no category': 'uncategorized', uncategorized: 'uncategorized', 'sin categoria': 'uncategorized',
};

function normalize(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

// Same default category can exist as PT, EN and ES rows in one organization.
// Keep one per translation key so lists don't show visible duplicates.
// Rows in keepIds (for example the value currently selected) always stay.
export function dedupeCategories(list = [], keepIds = []) {
  const keep = new Set((keepIds || []).filter(Boolean).map(String));
  const seen = new Set();
  const out = [];
  for (const cat of list || []) {
    if (!cat) continue;
    const key = categoryKey(cat.name);
    if (!key) { out.push(cat); continue; }
    const id = cat.id != null ? String(cat.id) : null;
    if (seen.has(key) && !(id && keep.has(id))) continue;
    seen.add(key);
    out.push(cat);
  }
  return out;
}

export default categoryName;
