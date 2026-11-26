// Accounts created on WhatsApp get a placeholder email such as
// wa5511999999999@phone.meuazulao.invalid. Never show it: show the phone.
const PLACEHOLDER_EMAIL = /@phone\.meuazulao\.invalid$/i;

export function isPlaceholderEmail(email) {
  return typeof email === 'string' && PLACEHOLDER_EMAIL.test(email.trim());
}

/** Email as it may be shown to people: '' for a placeholder. */
export function visibleEmail(email) {
  return isPlaceholderEmail(email) ? '' : (email || '');
}

function phoneFromPlaceholder(email) {
  const m = /^wa(\d+)@/i.exec(String(email || ''));
  return m ? m[1] : '';
}

export function formatPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // Brazil: +55 11 99999-9999
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const area = digits.slice(2, 4);
    const rest = digits.slice(4);
    return `+55 ${area} ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return `+${digits}`;
}

/** Best contact line for a user: real email, else the phone. */
export function contactLine(user) {
  if (!user) return '';
  const email = visibleEmail(user.email);
  if (email) return email;
  return formatPhone(user.phone || phoneFromPlaceholder(user.email));
}

/** True for users Zul created on WhatsApp (placeholder email). */
export function isWhatsAppCreatedUser(user) {
  return Boolean(user && isPlaceholderEmail(user.email));
}
