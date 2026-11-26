// Accounts created through WhatsApp get a synthetic email such as
// wa5511999999999@phone.meuazulao.invalid. It is an internal identifier and
// must never be shown to people; show their phone number instead.
const PLACEHOLDER_EMAIL = /^wa(\d+)@phone\.meuazulao\.invalid$/i;
const PLACEHOLDER_DOMAIN = /@phone\.meuazulao\.invalid$/i;

export function isPlaceholderEmail(email) {
  return typeof email === 'string' && PLACEHOLDER_DOMAIN.test(email.trim());
}

/** Phone digits encoded in a placeholder email, or '' when there are none. */
export function phoneFromPlaceholderEmail(email) {
  const match = typeof email === 'string' ? email.trim().match(PLACEHOLDER_EMAIL) : null;
  return match ? match[1] : '';
}

/** Formats stored phone digits (E.164 without '+') for display. */
export function formatPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  // Brazilian numbers: +55 (11) 99999-9999 / +55 (11) 9999-9999
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const area = digits.slice(2, 4);
    const local = digits.slice(4);
    const split = local.length - 4;
    return `+55 (${area}) ${local.slice(0, split)}-${local.slice(split)}`;
  }
  return `+${digits}`;
}

/**
 * The contact line to show for a person: their real email, or their phone
 * when the email is a WhatsApp placeholder. Returns '' when neither is usable.
 */
export function displayContact({ email, phone } = {}) {
  if (email && !isPlaceholderEmail(email)) return email;
  const digits = phone || phoneFromPlaceholderEmail(email);
  return formatPhone(digits);
}
