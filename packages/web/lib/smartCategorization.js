// ============================================================================
// Smart Categorization - Keyword-based category suggestion
// ============================================================================

/**
 * Keywords mapping for automatic category suggestion
 * Based on common Brazilian spending patterns
 */
const CATEGORY_KEYWORDS = {
  alimentacao: [
    'mercado', 'supermercado', 'padaria', 'acougue', 'hortifruti',
    'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria',
    'ifood', 'rappi', 'uber eats', 'delivery',
    'feira', 'sacolao', 'quitanda',
    'extra', 'carrefour', 'pao de acucar', 'walmart', 'assai'
  ],
  
  transporte: [
    'uber', '99', 'cabify', 'taxi',
    'gasolina', 'combustivel', 'posto', 'shell', 'ipiranga',
    'estacionamento', 'zona azul', 'vaga',
    'onibus', 'metro', 'trem', 'bilhete',
    'pedagio', 'via facil', 'sem parar',
    'oficina', 'mecanico', 'pneu', 'oleo'
  ],
  
  saude: [
    'farmacia', 'drogaria', 'drogasil', 'pacheco',
    'consulta', 'medico', 'dentista', 'psicologo',
    'hospital', 'clinica', 'laboratorio', 'exame',
    'remedio', 'medicamento', 'receita',
    'plano de saude', 'unimed', 'amil', 'bradesco saude'
  ],
  
  casa: [
    'aluguel', 'condominio', 'iptu',
    'luz', 'energia', 'eletrica', 'cemig', 'light',
    'agua', 'saneamento', 'sabesp', 'cedae',
    'gas', 'ultragaz', 'liquigas',
    'internet', 'telefone', 'vivo', 'claro', 'tim', 'oi',
    'limpeza', 'faxina', 'diarista',
    'reforma', 'pintura', 'encanador', 'eletricista',
    'moveis', 'decoracao', 'utilidades'
  ],
  
  lazer: [
    'cinema', 'teatro', 'show', 'ingresso',
    'netflix', 'spotify', 'amazon prime', 'disney',
    'streaming', 'assinatura',
    'bar', 'balada', 'pub', 'cerveja',
    'viagem', 'hotel', 'pousada', 'airbnb',
    'parque', 'diversao', 'entretenimento'
  ],
  
  educacao: [
    'escola', 'colegio', 'faculdade', 'universidade',
    'curso', 'aula', 'professor',
    'livro', 'apostila', 'material escolar',
    'mensalidade', 'matricula'
  ],
  
  vestuario: [
    'roupa', 'camisa', 'calca', 'vestido', 'sapato',
    'loja', 'renner', 'c&a', 'riachuelo', 'zara',
    'calcado', 'tenis', 'sandalia',
    'acessorio', 'bolsa', 'relogio'
  ],
  
  investimentos: [
    'investimento', 'aplicacao', 'poupanca',
    'tesouro', 'cdb', 'lci', 'lca',
    'acao', 'fundo', 'renda fixa',
    'corretora', 'xp', 'rico', 'clear',
    'cripto', 'bitcoin', 'ethereum'
  ],
  
  outros: [
    'transferencia', 'pix', 'ted', 'doc',
    'saque', 'deposito'
  ]
};

/**
 * Normalize text for comparison (remove accents, lowercase)
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
 * Suggest category based on description
 * @param {string} description - Transaction description
 * @param {Array} availableCategories - List of available categories
 * @returns {Object} { categoryId, categoryName, confidence }
 */
export function suggestCategory(description, availableCategories = []) {
  if (!description || !availableCategories.length) {
    return null;
  }

  const normalized = normalizeText(description);
  const scores = {};

  // Calculate score for each category
  Object.keys(CATEGORY_KEYWORDS).forEach(categoryKey => {
    const keywords = CATEGORY_KEYWORDS[categoryKey];
    let score = 0;

    keywords.forEach(keyword => {
      const normalizedKeyword = normalizeText(keyword);
      
      // Exact match: high score
      if (normalized === normalizedKeyword) {
        score += 100;
      }
      // Contains keyword: medium score
      else if (normalized.includes(normalizedKeyword)) {
        score += 50;
      }
      // Keyword contains description: low score
      else if (normalizedKeyword.includes(normalized) && normalized.length > 3) {
        score += 25;
      }
    });

    if (score > 0) {
      scores[categoryKey] = score;
    }
  });

  // Find best match
  const bestMatch = Object.keys(scores).reduce((best, current) => {
    return scores[current] > scores[best] ? current : best;
  }, Object.keys(scores)[0]);

  if (!bestMatch) return null;

  // Find corresponding category in availableCategories
  const matchedCategory = availableCategories.find(cat => 
    normalizeText(cat.name).includes(bestMatch) ||
    bestMatch.includes(normalizeText(cat.name))
  );

  if (!matchedCategory) return null;

  // Calculate confidence (0-100)
  const maxScore = Math.max(...Object.values(scores));
  const confidence = Math.min(100, Math.round((maxScore / 100) * 100));

  return {
    categoryId: matchedCategory.id,
    categoryName: matchedCategory.name,
    confidence,
    matchedKeyword: bestMatch
  };
}

/**
 * Learn from user confirmation
 * Store user's choice to improve future suggestions
 * @param {string} description - Original description
 * @param {string} categoryName - User's chosen category
 */
export function learnFromConfirmation(description, categoryName) {
  // Get or create learning data from localStorage
  const learningKey = 'smart_categorization_learning';
  let learningData = {};
  
  try {
    const stored = localStorage.getItem(learningKey);
    if (stored) {
      learningData = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading learning data:', e);
  }

  // Store the association
  const normalized = normalizeText(description);
  if (!learningData[normalized]) {
    learningData[normalized] = {};
  }
  
  learningData[normalized][categoryName] = (learningData[normalized][categoryName] || 0) + 1;

  // Save back to localStorage
  try {
    localStorage.setItem(learningKey, JSON.stringify(learningData));
  } catch (e) {
    console.error('Error saving learning data:', e);
  }
}

/**
 * Get learned category for a description
 * @param {string} description - Transaction description
 * @param {Array} availableCategories - List of available categories
 * @returns {Object|null} Category if learned, null otherwise
 */
export function getLearnedCategory(description, availableCategories = []) {
  const learningKey = 'smart_categorization_learning';
  
  try {
    const stored = localStorage.getItem(learningKey);
    if (!stored) return null;
    
    const learningData = JSON.parse(stored);
    const normalized = normalizeText(description);
    
    if (!learningData[normalized]) return null;
    
    // Find most confirmed category
    const categoryScores = learningData[normalized];
    const bestCategory = Object.keys(categoryScores).reduce((best, current) => {
      return categoryScores[current] > categoryScores[best] ? current : best;
    }, Object.keys(categoryScores)[0]);
    
    // Find in available categories
    const matchedCategory = availableCategories.find(cat => 
      normalizeText(cat.name) === normalizeText(bestCategory)
    );
    
    if (!matchedCategory) return null;
    
    return {
      categoryId: matchedCategory.id,
      categoryName: matchedCategory.name,
      confidence: 100, // User-confirmed = 100% confidence
      learned: true
    };
  } catch (e) {
    console.error('Error getting learned category:', e);
    return null;
  }
}

/**
 * Get category suggestion with learning priority
 * First checks learned data, then falls back to keywords
 * @param {string} description - Transaction description
 * @param {Array} availableCategories - List of available categories
 * @returns {Object|null} Suggested category
 */
export function getCategorySuggestion(description, availableCategories = []) {
  // First, check if we have learned data
  const learned = getLearnedCategory(description, availableCategories);
  if (learned) return learned;
  
  // Fall back to keyword-based suggestion
  return suggestCategory(description, availableCategories);
}

