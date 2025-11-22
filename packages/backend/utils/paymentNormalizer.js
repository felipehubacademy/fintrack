/**
 * Payment Method Normalizer
 * Centraliza e padroniza a normalização de métodos de pagamento
 * 
 * Entrada: qualquer string de método de pagamento
 * Saída: valor canônico padronizado
 */

/**
 * Normaliza métodos de pagamento para valores canônicos
 * 
 * @param {string} input - Método de pagamento informado pelo usuário
 * @returns {string} Valor canônico (credit_card, debit_card, pix, cash, bank_transfer, boleto, other)
 * 
 * @example
 * normalizePaymentMethod('crédito') // → 'credit_card'
 * normalizePaymentMethod('pix') // → 'pix'
 * normalizePaymentMethod('debit') // → 'debit_card'
 */
export function normalizePaymentMethod(input) {
  if (!input) return 'other';
  
  // Normalizar: minúsculas, remover acentos, trim
  const normalized = String(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
  
  console.log('🔍 [PAYMENT_NORMALIZER] Input:', input, '→ Normalized:', normalized);
  
  // Mapeamento completo e ordenado por prioridade
  const mapping = [
    // Cartão de Crédito
    { keys: ['credit_card', 'credit', 'credito', 'cred'], value: 'credit_card' },
    { keys: ['visa', 'mastercard', 'amex', 'amex', 'elo', 'hipercard'], value: 'credit_card' },
    { keys: ['cred', 'cartao cred', 'cartão cred'], value: 'credit_card' },
    
    // Cartão de Débito
    { keys: ['debit_card', 'debit', 'debito', 'deb'], value: 'debit_card' },
    { keys: ['cartao deb', 'cartão deb', 'debito automatico'], value: 'debit_card' },
    
    // PIX
    { keys: ['pix'], value: 'pix' },
    
    // Dinheiro
    { keys: ['cash', 'dinheiro', 'especie', 'especia', 'din', 'notas', 'moedas'], value: 'cash' },
    
    // Transferência Bancária
    { keys: ['bank_transfer', 'transferencia', 'transfer', 'ted', 'doc'], value: 'bank_transfer' },
    
    // Boleto
    { keys: ['boleto', 'fatura', 'conta'], value: 'boleto' }
  ];
  
  // Buscar no mapeamento
  for (const { keys, value } of mapping) {
    // Match exato
    if (keys.some(key => key === normalized)) {
      console.log('🔍 [PAYMENT_NORMALIZER] →', value);
      return value;
    }
    
    // Match parcial (normalized contém alguma key)
    if (keys.some(key => normalized.includes(key) || key.includes(normalized))) {
      console.log('🔍 [PAYMENT_NORMALIZER] →', value);
      return value;
    }
  }
  
  console.log('🔍 [PAYMENT_NORMALIZER] → other (fallback)');
  return 'other';
}

/**
 * Valida se um método de pagamento é válido
 * 
 * @param {string} input - Método de pagamento para validar
 * @returns {boolean} True se válido
 */
export function isValidPaymentMethod(input) {
  const normalized = normalizePaymentMethod(input);
  return normalized !== 'other';
}

/**
 * Obtém a lista de métodos de pagamento válidos
 * 
 * @returns {string[]} Array com métodos válidos
 */
export function getValidPaymentMethods() {
  return [
    'credit_card',
    'debit_card',
    'pix',
    'cash',
    'bank_transfer',
    'boleto',
    'other'
  ];
}

/**
 * Obtém nomes amigáveis dos métodos de pagamento
 * 
 * @param {string} method - Método canônico
 * @returns {string} Nome amigável
 */
export function getFriendlyPaymentMethodName(method) {
  const names = {
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'pix': 'PIX',
    'cash': 'Dinheiro',
    'bank_transfer': 'Transferência Bancária',
    'boleto': 'Boleto',
    'other': 'Outro'
  };
  
  return names[method] || 'Desconhecido';
}

// Testes unitários (se executado diretamente)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testando Payment Normalizer...\n');
  
  const tests = [
    ['crédito', 'credit_card'],
    ['credit_card', 'credit_card'],
    ['cred', 'credit_card'],
    ['pix', 'pix'],
    ['PIX', 'pix'],
    ['dinheiro', 'cash'],
    ['cash', 'cash'],
    ['débito', 'debit_card'],
    ['debit', 'debit_card'],
    ['transferencia', 'bank_transfer'],
    ['ted', 'bank_transfer'],
    ['outro', 'other'],
    ['invalido', 'other'],
    [null, 'other'],
    ['', 'other']
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(([input, expected]) => {
    const result = normalizePaymentMethod(input);
    const success = result === expected;
    
    if (success) {
      console.log(`✅ "${input}" → "${result}"`);
      passed++;
    } else {
      console.log(`❌ "${input}" → "${result}" (esperado: "${expected}")`);
      failed++;
    }
  });
  
  console.log(`\n📊 Resultado: ${passed} passaram, ${failed} falharam`);
  
  if (failed === 0) {
    console.log('🎉 Todos os testes passaram!');
  }
}

export default {
  normalizePaymentMethod,
  isValidPaymentMethod,
  getValidPaymentMethods,
  getFriendlyPaymentMethodName
};

