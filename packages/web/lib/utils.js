import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Utilitários de data para normalizar fuso horário do Brasil (America/Sao_Paulo)
 * Todas as datas devem ser tratadas no fuso horário do Brasil para evitar problemas
 * de comparação e exibição.
 */

/**
 * Obtém a data atual no fuso horário do Brasil
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
 * Compara duas datas ignorando a hora, considerando fuso horário do Brasil
 * @param {Date|string} date1 - Primeira data
 * @param {Date|string} date2 - Segunda data
 * @returns {number} -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export function compareBrazilDates(date1, date2) {
  const d1 = typeof date1 === 'string' ? createBrazilDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? createBrazilDate(date2) : date2;
  
  if (!d1 || !d2) return 0;
  
  // Normalizar para apenas data (sem hora)
  const normalized1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const normalized2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  
  if (normalized1 < normalized2) return -1;
  if (normalized1 > normalized2) return 1;
  return 0;
}

/**
 * Verifica se uma data é anterior ou igual a hoje (no fuso do Brasil)
 * @param {Date|string} date - Data a verificar
 * @returns {boolean} true se a data é <= hoje
 */
export function isDateBeforeOrEqualToday(date) {
  const today = getBrazilToday();
  const targetDate = typeof date === 'string' ? createBrazilDate(date) : date;
  
  if (!targetDate) return false;
  
  const normalizedTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return normalizedTarget <= today;
}

/**
 * Verifica se uma data é posterior a hoje (no fuso do Brasil)
 * @param {Date|string} date - Data a verificar
 * @returns {boolean} true se a data é > hoje
 */
export function isDateAfterToday(date) {
  const today = getBrazilToday();
  const targetDate = typeof date === 'string' ? createBrazilDate(date) : date;
  
  if (!targetDate) return false;
  
  const normalizedTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return normalizedTarget > today;
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
 * Utilitários de formatação monetária brasileira
 * Formato: 1.000,00 (ponto para milhar, vírgula para decimal)
 */

/**
 * Formata um número para formato monetário brasileiro
 * @param {number|string} value - Valor numérico ou string numérica
 * @returns {string} Valor formatado (ex: "1.000,50")
 */
export function formatCurrencyInput(value) {
  if (!value && value !== 0) return '';
  
  // Converter para número
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  
  if (isNaN(numValue)) return '';
  
  // Formatar com 2 casas decimais
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Parseia um valor formatado (ex: "1.000,50") de volta para número
 * @param {string} formattedValue - Valor formatado (ex: "1.000,50")
 * @returns {number} Valor numérico (ex: 1000.50)
 */
export function parseCurrencyInput(formattedValue) {
  if (!formattedValue) return 0;
  
  // Remover tudo que não for número, vírgula, ponto ou sinal
  const sanitized = formattedValue.replace(/[^\d,.-]/g, '');
  
  // Remover múltiplos sinais e manter apenas o primeiro
  const normalized = sanitized.replace(/(?!^)-/g, '');
  
  // Remover pontos (separadores de milhar) e substituir vírgula por ponto
  const cleaned = normalized.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Processa valor de moeda diretamente (sem evento)
 * Remove formatação e mantém apenas números e vírgula
 * @param {string} value - Valor do input
 * @returns {string} Valor processado (sem R$)
 */
export function processCurrencyInput(value) {
  if (value === '') {
    return '';
  }

  // Remover qualquer coisa que não seja número, vírgula, ponto ou sinal
  let cleaned = value.replace(/[^\d,.-]/g, '');

  if (!cleaned) {
    return '';
  }

  // Normalizar múltiplos sinais
  cleaned = cleaned.replace(/(?!^)-/g, '');

  // Garantir apenas um separador decimal
  const parts = cleaned.split(/[,.]/);
  if (parts.length > 2) {
    const integerPart = parts.slice(0, -1).join('');
    const decimalPart = parts[parts.length - 1];
    cleaned = integerPart + ',' + decimalPart.slice(0, 2);
  } else if (parts.length === 2) {
    cleaned = parts[0] + ',' + parts[1].slice(0, 2);
  }

  return cleaned;
}

/**
 * Handler para onChange de campos monetários
 * Permite digitação livre, apenas limpa e valida
 * A formatação completa é feita no onBlur
 * @param {Event} e - Evento do input
 * @param {Function} setValue - Função para atualizar o valor
 * @param {string} fieldName - Nome do campo (opcional, para objetos)
 */
export function handleCurrencyChange(e, setValue, fieldName = null) {
  const inputValue = e.target.value;
  
  // Permitir apagar completamente
  if (inputValue === '') {
    if (fieldName) {
      setValue(prev => ({ ...prev, [fieldName]: '' }));
    } else {
      setValue('');
    }
    return;
  }
  
  // Remover tudo exceto números, vírgula e ponto
  let cleaned = inputValue.replace(/[^\d,.]/g, '');
  
  // Se não tem nada, retornar vazio
  if (!cleaned) {
    if (fieldName) {
      setValue(prev => ({ ...prev, [fieldName]: '' }));
    } else {
      setValue('');
    }
    return;
  }
  
  // Garantir apenas uma vírgula ou ponto (para decimal)
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // Se tem ambos, manter apenas o último
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      cleaned = cleaned.replace(/,/g, '');
      cleaned = cleaned.replace('.', ',');
    }
  } else if (hasDot && !hasComma) {
    // Converter ponto para vírgula (padrão brasileiro)
    cleaned = cleaned.replace('.', ',');
  }
  
  // Limitar a 2 casas decimais
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
      cleaned = parts.join(',');
    }
  }
  
  // Durante a digitação, apenas limpar e validar, sem formatar
  // A formatação completa será feita no onBlur
  if (fieldName) {
    setValue(prev => ({ ...prev, [fieldName]: cleaned }));
  } else {
    setValue(cleaned);
  }
}
