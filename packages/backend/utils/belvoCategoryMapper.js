// ============================================================================
// Belvo Category Mapper
// Maps Belvo transaction categories to FinTrack budget_categories
// ============================================================================

/**
 * Belvo Category → FinTrack Category Mapping
 * 
 * Belvo uses standardized categories from Open Finance Brasil
 * This mapper translates them to FinTrack's Portuguese categories
 * 
 * Reference: https://developers.belvo.com/docs/categorization
 */

const BELVO_TO_FINTRACK_MAP = {
  // ============ ALIMENTAÇÃO ============
  'food_and_groceries': 'Alimentação',
  'restaurants_and_dining': 'Alimentação',
  'food_delivery': 'Alimentação',
  'groceries': 'Alimentação',
  'restaurants': 'Alimentação',
  
  // ============ TRANSPORTE ============
  'transport_and_travel': 'Transporte',
  'transportation': 'Transporte',
  'fuel': 'Transporte',
  'automotive': 'Transporte',
  'public_transportation': 'Transporte',
  'taxi_and_rideshare': 'Transporte',
  'parking': 'Transporte',
  'tolls': 'Transporte',
  'vehicle_maintenance': 'Transporte',
  'vehicle_insurance': 'Transporte',
  
  // ============ SAÚDE ============
  'health_and_medical': 'Saúde',
  'healthcare': 'Saúde',
  'pharmacy': 'Saúde',
  'medical_services': 'Saúde',
  'health_insurance': 'Saúde',
  'dental': 'Saúde',
  'vision': 'Saúde',
  'fitness': 'Saúde',
  
  // ============ CASA/MORADIA ============
  'home_and_utilities': 'Casa',
  'housing': 'Casa',
  'rent': 'Casa',
  'utilities': 'Casa',
  'electricity': 'Casa',
  'water': 'Casa',
  'gas': 'Casa',
  'internet': 'Casa',
  'phone': 'Casa',
  'home_maintenance': 'Casa',
  'home_improvement': 'Casa',
  'furniture': 'Casa',
  'home_insurance': 'Casa',
  
  // ============ LAZER ============
  'entertainment': 'Lazer',
  'recreation': 'Lazer',
  'hobbies': 'Lazer',
  'streaming_services': 'Lazer',
  'movies_and_music': 'Lazer',
  'events': 'Lazer',
  'sports': 'Lazer',
  'travel': 'Lazer',
  'hotels': 'Lazer',
  'vacation': 'Lazer',
  'bars_and_nightlife': 'Lazer',
  
  // ============ EDUCAÇÃO ============
  'education': 'Educação',
  'tuition': 'Educação',
  'books_and_supplies': 'Educação',
  'courses': 'Educação',
  'student_loans': 'Educação',
  
  // ============ VESTUÁRIO ============
  'shopping': 'Vestuário',
  'clothing': 'Vestuário',
  'shoes': 'Vestuário',
  'accessories': 'Vestuário',
  'personal_care': 'Vestuário',
  'beauty': 'Vestuário',
  'hair_and_beauty': 'Vestuário',
  
  // ============ INVESTIMENTOS ============
  'investments': 'Investimentos',
  'savings': 'Investimentos',
  'retirement': 'Investimentos',
  'securities': 'Investimentos',
  'crypto': 'Investimentos',
  'investment_fees': 'Investimentos',
  
  // ============ CONTAS/BILLS ============
  'bills_and_payments': 'Contas',
  'insurance': 'Contas',
  'life_insurance': 'Contas',
  'subscriptions': 'Contas',
  'memberships': 'Contas',
  'taxes': 'Contas',
  'fees': 'Contas',
  'bank_fees': 'Contas',
  'credit_card_payment': 'Contas',
  'loan_payment': 'Contas',
  
  // ============ OUTROS ============
  'transfers': 'Outros',
  'atm': 'Outros',
  'cash_withdrawal': 'Outros',
  'deposits': 'Outros',
  'pets': 'Outros',
  'donations': 'Outros',
  'charity': 'Outros',
  'gifts': 'Outros',
  'uncategorized': 'Outros',
  'other': 'Outros',
  'unknown': 'Outros',
};

/**
 * Default fallback category when no match is found
 */
const DEFAULT_CATEGORY = 'Outros';

/**
 * Maps a Belvo category to a FinTrack category name
 * @param {string} belvoCategory - Category from Belvo transaction
 * @returns {string} FinTrack category name (Portuguese)
 */
function mapBelvoCategory(belvoCategory) {
  if (!belvoCategory) {
    return DEFAULT_CATEGORY;
  }
  
  const normalized = belvoCategory.toLowerCase().trim();
  return BELVO_TO_FINTRACK_MAP[normalized] || DEFAULT_CATEGORY;
}

/**
 * Finds the budget_category ID based on Belvo category and org categories
 * @param {string} belvoCategory - Category from Belvo transaction
 * @param {Array} orgCategories - Organization's budget_categories from DB
 * @returns {string|null} Category ID or null if not found
 */
function findCategoryId(belvoCategory, orgCategories = []) {
  if (!belvoCategory || !orgCategories.length) {
    return null;
  }
  
  const fintrackCategoryName = mapBelvoCategory(belvoCategory);
  
  // Find matching category (case-insensitive)
  const match = orgCategories.find(cat => 
    cat.name.toLowerCase() === fintrackCategoryName.toLowerCase()
  );
  
  return match ? match.id : null;
}

/**
 * Normalize text for comparison (remove accents, lowercase)
 * @param {string} text 
 * @returns {string}
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Maps Belvo category with fallback to description-based detection
 * This provides a more robust categorization when Belvo's category is generic
 * 
 * @param {string} belvoCategory - Category from Belvo
 * @param {string} description - Transaction description
 * @param {Array} orgCategories - Organization's budget_categories
 * @returns {Object} { categoryId, categoryName, source }
 */
function mapCategoryWithFallback(belvoCategory, description, orgCategories = []) {
  // First try: Use Belvo category
  const categoryId = findCategoryId(belvoCategory, orgCategories);
  const categoryName = mapBelvoCategory(belvoCategory);
  
  if (categoryId && categoryName !== DEFAULT_CATEGORY) {
    return {
      categoryId,
      categoryName,
      source: 'belvo'
    };
  }
  
  // Fallback: Use description-based detection (similar to smartCategorization)
  if (description) {
    const normalized = normalizeText(description);
    
    // Food keywords
    if (/(mercado|supermercado|padaria|restaurante|ifood|rappi|delivery)/i.test(normalized)) {
      const cat = orgCategories.find(c => normalizeText(c.name) === 'alimentacao');
      if (cat) return { categoryId: cat.id, categoryName: cat.name, source: 'description' };
    }
    
    // Transport keywords
    if (/(uber|99|taxi|gasolina|combustivel|estacionamento|pedagio)/i.test(normalized)) {
      const cat = orgCategories.find(c => normalizeText(c.name) === 'transporte');
      if (cat) return { categoryId: cat.id, categoryName: cat.name, source: 'description' };
    }
    
    // Health keywords
    if (/(farmacia|drogaria|consulta|medico|hospital|clinica)/i.test(normalized)) {
      const cat = orgCategories.find(c => normalizeText(c.name) === 'saude');
      if (cat) return { categoryId: cat.id, categoryName: cat.name, source: 'description' };
    }
    
    // Home/utilities keywords
    if (/(aluguel|condominio|luz|agua|gas|internet|telefone)/i.test(normalized)) {
      const cat = orgCategories.find(c => normalizeText(c.name) === 'casa');
      if (cat) return { categoryId: cat.id, categoryName: cat.name, source: 'description' };
    }
    
    // Entertainment keywords
    if (/(cinema|netflix|spotify|bar|viagem|hotel)/i.test(normalized)) {
      const cat = orgCategories.find(c => normalizeText(c.name) === 'lazer');
      if (cat) return { categoryId: cat.id, categoryName: cat.name, source: 'description' };
    }
  }
  
  // Last resort: Return "Outros"
  const outrosCategory = orgCategories.find(c => 
    normalizeText(c.name) === 'outros'
  );
  
  return {
    categoryId: outrosCategory?.id || null,
    categoryName: 'Outros',
    source: 'default'
  };
}

/**
 * Get all Belvo categories (for reference/debugging)
 * @returns {Array} List of all Belvo categories supported
 */
function getSupportedBelvoCategories() {
  return Object.keys(BELVO_TO_FINTRACK_MAP).sort();
}

/**
 * Get mapping statistics (for debugging)
 * @returns {Object} Statistics about the mapping
 */
function getMappingStats() {
  const fintrackCategories = new Set(Object.values(BELVO_TO_FINTRACK_MAP));
  return {
    totalBelvoCategories: Object.keys(BELVO_TO_FINTRACK_MAP).length,
    uniqueFintrackCategories: fintrackCategories.size,
    fintrackCategories: Array.from(fintrackCategories).sort()
  };
}

module.exports = {
  mapBelvoCategory,
  findCategoryId,
  mapCategoryWithFallback,
  getSupportedBelvoCategories,
  getMappingStats,
  normalizeText,
  DEFAULT_CATEGORY,
  BELVO_TO_FINTRACK_MAP
};

