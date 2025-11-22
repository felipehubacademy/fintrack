/**
 * Format number to Brazilian currency
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado (ex: "R$ 1.234,56")
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Parse currency string to number
 * @param {string} value - String formatada (ex: "R$ 1.234,56")
 * @returns {number} - Valor numérico (ex: 1234.56)
 */
export function parseCurrency(value) {
  if (!value) return 0;
  
  // Remove "R$" e espaços
  let cleaned = value.replace(/R\$\s?/g, '');
  
  // Remove pontos (milhares)
  cleaned = cleaned.replace(/\./g, '');
  
  // Substitui vírgula por ponto
  cleaned = cleaned.replace(/,/g, '.');
  
  return parseFloat(cleaned) || 0;
}

