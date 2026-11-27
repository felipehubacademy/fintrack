// Bank account types stored in bank_accounts.account_type.
export const ACCOUNT_TYPES = ['checking', 'savings', 'pension', 'investment', 'loan'];

/** Translated label for an account type; t is the i18n translate function. */
export function accountTypeLabel(type, t) {
  return ACCOUNT_TYPES.includes(type)
    ? t(`finances.accountTypes.${type}`)
    : t('finances.accountTypes.default');
}
