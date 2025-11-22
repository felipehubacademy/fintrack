/**
 * Utilitários de data para uso em APIs (Node.js) e componentes (browser/mobile)
 * Normaliza todas as datas para o fuso horário do Brasil (America/Sao_Paulo)
 * Funciona em Web (Next.js) e Mobile (React Native/Expo)
 */

/**
 * Obtém a data atual no fuso horário do Brasil
 * Funciona tanto no browser quanto no Node.js e React Native
 * @returns {Date} Data atual no fuso do Brasil (America/Sao_Paulo)
 */
export function getBrazilDate() {
  const now = new Date();
  
  // Obter componentes da data no fuso do Brasil
  const brazilDateStr = now.toLocaleString("en-US", { 
    timeZone: "America/Sao_Paulo",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parsear a string no formato MM/DD/YYYY, HH:MM:SS
  const [datePart, timePart] = brazilDateStr.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  
  // Criar data no fuso local com os valores do Brasil
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Obtém a data de hoje (sem hora) no fuso horário do Brasil
 * @returns {Date} Data de hoje às 00:00:00 no fuso do Brasil
 */
export function getBrazilToday() {
  const now = new Date();
  // Obter apenas a data (sem hora) no fuso do Brasil
  const brazilDateStr = now.toLocaleString("en-US", { 
    timeZone: "America/Sao_Paulo",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parsear a string no formato MM/DD/YYYY
  const [month, day, year] = brazilDateStr.split('/').map(Number);
  
  // Criar data no fuso local com os valores do Brasil (sem hora)
  return new Date(year, month - 1, day);
}

/**
 * Obtém a data de hoje no formato "YYYY-MM-DD" no fuso horário do Brasil
 * @returns {string} Data de hoje no formato "YYYY-MM-DD"
 */
export function getBrazilTodayString() {
  const today = getBrazilToday();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtém a data de amanhã no formato "YYYY-MM-DD" no fuso horário do Brasil
 * @returns {string} Data de amanhã no formato "YYYY-MM-DD"
 */
export function getBrazilTomorrowString() {
  const today = getBrazilToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cria uma data no fuso horário do Brasil a partir de uma string "YYYY-MM-DD"
 * @param {string} dateString - Data no formato "YYYY-MM-DD"
 * @returns {Date} Data criada no fuso do Brasil (sem hora, 00:00:00)
 */
export function createBrazilDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  // Criar data no fuso local (que deve ser Brasil), mas garantir que seja tratada como data local
  return new Date(year, month - 1, day); // month é 0-indexed
}

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 * @param {Date|string} date - Data para formatar
 * @returns {string} Data formatada como DD/MM/YYYY
 */
export function formatDateBR(date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata um valor monetário para o formato brasileiro (R$ 1.234,56)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

