/**
 * Belvo Category Mapper
 * Maps Belvo transaction categories to FinTrack budget categories
 */

// Belvo → FinTrack category mapping
const CATEGORY_MAP = {
  // Food & Dining
  'food_and_groceries': 'Alimentação',
  'restaurants_and_dining': 'Alimentação',
  
  // Transportation
  'transport_and_travel': 'Transporte',
  'auto_and_transport': 'Transporte',
  'gas_and_fuel': 'Transporte',
  
  // Healthcare
  'health_and_fitness': 'Saúde',
  'healthcare': 'Saúde',
  'pharmacy': 'Saúde',
  
  // Entertainment & Leisure
  'entertainment': 'Lazer',
  'recreation': 'Lazer',
  'sports': 'Lazer',
  'hobbies': 'Lazer',
  
  // Bills & Utilities
  'bills_and_utilities': 'Contas',
  'utilities': 'Contas',
  'phone': 'Contas',
  'internet': 'Contas',
  'electricity': 'Contas',
  'water': 'Contas',
  'gas': 'Contas',
  
  // Home
  'home': 'Casa',
  'home_improvement': 'Casa',
  'rent': 'Casa',
  'mortgage': 'Casa',
  'home_services': 'Casa',
  
  // Education
  'education': 'Educação',
  'books': 'Educação',
  
  // Investments
  'investments': 'Investimentos',
  'financial': 'Investimentos',
  'savings': 'Investimentos',
  
  // Income categories
  'income': 'Salário',
  'salary': 'Salário',
  'payroll': 'Salário',
  'bonus': 'Bonificação',
  'freelance': 'Freelance',
  'business_income': 'Vendas',
  'rental_income': 'Aluguel Recebido',
  'investment_income': 'Investimentos (Retorno)',
  'interest_income': 'Investimentos (Retorno)',
  'dividends': 'Investimentos (Retorno)',
  
  // Transfers
  'transfer': 'Transferência',
  'internal_transfer': 'Transferência',
  'bank_transfer': 'Transferência',
  
  // Default fallback
  'other': 'Outros',
  'uncategorized': 'Outros',
  'shopping': 'Outros',
  'personal_care': 'Outros',
  'clothing': 'Outros',
  'gifts_and_donations': 'Outros',
  'fees_and_charges': 'Outros',
  'taxes': 'Outros',
  'insurance': 'Outros',
};

/**
 * Maps a Belvo category to FinTrack category name
 * @param {string} belvoCategory - Category from Belvo transaction
 * @returns {string} FinTrack category name
 */
export function mapBelvoCategory(belvoCategory) {
  if (!belvoCategory) return 'Outros';
  
  const normalized = belvoCategory.toLowerCase().trim();
  return CATEGORY_MAP[normalized] || 'Outros';
}

/**
 * Gets category ID from FinTrack database based on Belvo category
 * @param {object} supabase - Supabase client
 * @param {string} belvoCategory - Category from Belvo
 * @param {string} organizationId - Organization ID (for custom categories)
 * @returns {Promise<string|null>} Category UUID or null
 */
export async function getBelvoCategoryId(supabase, belvoCategory, organizationId = null) {
  const categoryName = mapBelvoCategory(belvoCategory);
  
  // First try to find global default category
  const { data: globalCategory } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('name', categoryName)
    .eq('is_default', true)
    .is('organization_id', null)
    .single();
  
  if (globalCategory) {
    return globalCategory.id;
  }
  
  // If organization provided, try org-specific category
  if (organizationId) {
    const { data: orgCategory } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('name', categoryName)
      .eq('organization_id', organizationId)
      .single();
    
    if (orgCategory) {
      return orgCategory.id;
    }
  }
  
  // Fallback: try to find "Outros" category
  const { data: fallbackCategory } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('name', 'Outros')
    .eq('is_default', true)
    .is('organization_id', null)
    .single();
  
  return fallbackCategory?.id || null;
}

/**
 * Determines if a category is income-related
 * @param {string} belvoCategory - Category from Belvo
 * @returns {boolean}
 */
export function isIncomeCategory(belvoCategory) {
  if (!belvoCategory) return false;
  
  const normalized = belvoCategory.toLowerCase().trim();
  const incomeCategories = [
    'income', 'salary', 'payroll', 'bonus', 'freelance',
    'business_income', 'rental_income', 'investment_income',
    'interest_income', 'dividends'
  ];
  
  return incomeCategories.includes(normalized);
}

/**
 * Determines if a category is transfer-related
 * @param {string} belvoCategory - Category from Belvo
 * @returns {boolean}
 */
export function isTransferCategory(belvoCategory) {
  if (!belvoCategory) return false;
  
  const normalized = belvoCategory.toLowerCase().trim();
  const transferCategories = ['transfer', 'internal_transfer', 'bank_transfer'];
  
  return transferCategories.includes(normalized);
}

export default {
  mapBelvoCategory,
  getBelvoCategoryId,
  isIncomeCategory,
  isTransferCategory,
  CATEGORY_MAP
};
