/**
 * Lista de bancos disponíveis com logos
 * Usado nos dropdowns dos modais de cartão e conta
 */

import { bankLogos } from './bankLogos';
import { logoFlatSvg } from '../logoFlatSvg';

/**
 * Lista de bancos com logos disponíveis
 * Formato: { id: 'chave-do-banco', label: 'Nome Amigável' }
 */
export const AVAILABLE_BANKS = [
  { id: 'nubank', label: 'Nubank' },
  { id: 'itau', label: 'Itaú' },
  { id: 'bradesco', label: 'Bradesco' },
  { id: 'bb', label: 'Banco do Brasil' },
  { id: 'santander', label: 'Santander' },
  { id: 'inter', label: 'Banco Inter' },
  { id: 'c6', label: 'C6 Bank' },
  { id: 'caixa', label: 'Caixa Econômica Federal' },
  { id: 'btg', label: 'BTG Pactual' },
  { id: 'original', label: 'Original' },
  { id: 'neon', label: 'Neon' },
  { id: 'picpay', label: 'PicPay' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'xp', label: 'XP Investimentos' },
  { id: 'banrisul', label: 'Banrisul' },
  { id: 'bmg', label: 'BMG' },
  { id: 'bv', label: 'Banco BV' },
  { id: 'safra', label: 'Banco Safra' },
  { id: 'sicoob', label: 'Sicoob' },
  { id: 'sicredi', label: 'Sicredi' },
];

/**
 * Opção "Outros" que usa o logo da app
 */
export const OTHER_BANK_OPTION = { id: 'other', label: 'Outros' };

/**
 * Lista completa incluindo "Outros"
 */
export const ALL_BANK_OPTIONS = [...AVAILABLE_BANKS, OTHER_BANK_OPTION];

/**
 * Verifica se um banco tem logo disponível
 */
export function hasBankLogo(bankId) {
  if (bankId === 'other') return false;
  return bankLogos[bankId] !== null && bankLogos[bankId] !== undefined;
}

/**
 * Retorna o SVG do banco ou o logo da app se for "Outros"
 */
export function getBankLogoSvgOrAppLogo(bankId) {
  if (bankId === 'other' || !hasBankLogo(bankId)) {
    return logoFlatSvg;
  }
  return bankLogos[bankId];
}

/**
 * Retorna o nome amigável do banco
 */
export function getBankLabel(bankId) {
  if (bankId === 'other') return OTHER_BANK_OPTION.label;
  const bank = AVAILABLE_BANKS.find(b => b.id === bankId);
  return bank?.label || bankId;
}

