import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLocaleSettings, parseMoney, decimalSeparator } from "@fintrack/shared/i18n";

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
 * Active app locale tag ("pt-BR", "en-US", "es-419"...), for Intl/localeCompare.
 */
export function appLocale() {
  return getLocaleSettings().locale;
}

/** Active app currency code ("BRL", "USD"...). */
export function appCurrency() {
  return getLocaleSettings().currency;
}

/**
 * Format a number for a money input in the active locale, without the
 * currency symbol: 1000.5 -> "1.000,50" (pt) / "1,000.50" (en).
 * @param {number|string} value
 * @returns {string}
 */
export function formatCurrencyInput(value) {
  if (!value && value !== 0) return '';
  const numValue = typeof value === 'string' ? parseMoney(value) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString(appLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a money input typed in the active locale back into a number,
 * rounded to cents. Accepts "1.000,50", "1,000.50", "12,5", "12.5".
 * @param {string|number} formattedValue
 * @returns {number}
 */
export function parseCurrencyInput(formattedValue) {
  if (!formattedValue) return 0;
  if (typeof formattedValue === 'number') return Math.round(formattedValue * 100) / 100;
  const negative = /^\s*-/.test(formattedValue);
  const parsed = parseMoney(formattedValue.replace(/-/g, ''));
  if (isNaN(parsed)) return 0;
  const rounded = Math.round(parsed * 100) / 100;
  return negative ? -rounded : rounded;
}

/**
 * Clean a money input while typing: keeps digits and one decimal separator
 * (the active locale's), at most 2 decimals. A separator followed by more
 * than 2 digits is treated as a thousands separator and dropped.
 * @param {string} value
 * @param {{ allowNegative?: boolean }} [opts]
 * @returns {string}
 */
export function cleanCurrencyTyping(value, opts = {}) {
  if (!value) return '';
  const dec = decimalSeparator();
  const negative = Boolean(opts.allowNegative) && /^\s*-/.test(value);
  const cleaned = String(value).replace(/[^\d,.]/g, '');
  if (!cleaned) return negative ? '-' : '';
  const lastSep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  let out;
  if (lastSep === -1) {
    out = cleaned;
  } else {
    const intPart = cleaned.slice(0, lastSep).replace(/[,.]/g, '');
    const fracPart = cleaned.slice(lastSep + 1).replace(/[,.]/g, '');
    out = fracPart.length > 2 ? intPart + fracPart : `${intPart}${dec}${fracPart}`;
  }
  return negative ? `-${out}` : out;
}

/**
 * Process a money value directly (no event): keeps digits, sign and one
 * decimal separator in the active locale.
 * @param {string} value
 * @returns {string}
 */
export function processCurrencyInput(value) {
  if (value === '') return '';
  return cleanCurrencyTyping(value, { allowNegative: true });
}

/**
 * onChange handler for money inputs. Lets the user type freely in their
 * locale; full formatting happens on blur (formatCurrencyInput).
 * @param {Event} e
 * @param {Function} setValue
 * @param {string} fieldName - optional, for object state
 */
export function handleCurrencyChange(e, setValue, fieldName = null) {
  const cleaned = cleanCurrencyTyping(e.target.value);
  if (fieldName) {
    setValue((prev) => ({ ...prev, [fieldName]: cleaned }));
  } else {
    setValue(cleaned);
  }
}
