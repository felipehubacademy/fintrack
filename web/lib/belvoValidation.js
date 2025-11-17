/**
 * Belvo Validation Helpers
 * Functions to check if accounts/cards allow manual inputs
 */

/**
 * Check if a bank account or card allows manual inputs
 * @param {object} accountOrCard - Bank account or card object
 * @returns {boolean}
 */
export function allowsManualInput(accountOrCard) {
  if (!accountOrCard) return true;
  
  // If manual_inputs_allowed is explicitly false, block
  if (accountOrCard.manual_inputs_allowed === false) {
    return false;
  }
  
  // If provider is 'belvo' and data_source is 'belvo', block by default
  if (accountOrCard.provider === 'belvo' && accountOrCard.data_source === 'belvo') {
    return false;
  }
  
  // Otherwise allow
  return true;
}

/**
 * Filter accounts/cards to show only those that allow manual inputs
 * @param {array} items - Array of bank accounts or cards
 * @returns {array}
 */
export function filterManualInputsAllowed(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => allowsManualInput(item));
}

/**
 * Get error message for Belvo-synced account
 * @param {string} type - 'account' or 'card'
 * @returns {string}
 */
export function getBelvoErrorMessage(type = 'account') {
  const itemType = type === 'card' ? 'cartão' : 'conta';
  return `Este ${itemType} é sincronizado automaticamente via Belvo. Não é possível adicionar transações manualmente.`;
}

/**
 * Check if user can modify an account/card
 * @param {object} accountOrCard - Account or card object
 * @returns {object} { allowed: boolean, message: string }
 */
export function canModifyAccount(accountOrCard) {
  if (!accountOrCard) {
    return { allowed: true, message: '' };
  }
  
  if (!allowsManualInput(accountOrCard)) {
    const type = accountOrCard.card_type ? 'card' : 'account';
    return {
      allowed: false,
      message: getBelvoErrorMessage(type)
    };
  }
  
  return { allowed: true, message: '' };
}

/**
 * Check if account/card is Belvo-synced
 * @param {object} accountOrCard - Account or card object
 * @returns {boolean}
 */
export function isBelvoSynced(accountOrCard) {
  if (!accountOrCard) return false;
  return accountOrCard.provider === 'belvo' || accountOrCard.data_source === 'belvo';
}

export default {
  allowsManualInput,
  filterManualInputsAllowed,
  getBelvoErrorMessage,
  canModifyAccount,
  isBelvoSynced
};
