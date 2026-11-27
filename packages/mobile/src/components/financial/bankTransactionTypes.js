// bank_account_transactions.transaction_type values.
export const BANK_TRANSACTION_TYPES = [
  'manual_credit',
  'manual_debit',
  'expense_payment',
  'bill_payment',
  'income_deposit',
  'transfer_in',
  'transfer_out',
];

/** Translated label for a bank transaction type; t is the i18n translate function. */
export function bankTransactionTypeLabel(type, t) {
  return BANK_TRANSACTION_TYPES.includes(type) ? t(`finances.bankTxTypes.${type}`) : type;
}
