import {
  displayContact,
  formatPhone,
  isPlaceholderEmail,
  phoneFromPlaceholderEmail,
} from '../contactDisplay';

describe('contactDisplay', () => {
  const placeholder = 'wa5511987654321@phone.meuazulao.invalid';

  it('detects WhatsApp placeholder emails', () => {
    expect(isPlaceholderEmail(placeholder)).toBe(true);
    expect(isPlaceholderEmail('WA5511987654321@PHONE.MEUAZULAO.INVALID')).toBe(true);
    expect(isPlaceholderEmail('ana@example.com')).toBe(false);
    expect(isPlaceholderEmail(null)).toBe(false);
  });

  it('extracts the phone from a placeholder email', () => {
    expect(phoneFromPlaceholderEmail(placeholder)).toBe('5511987654321');
    expect(phoneFromPlaceholderEmail('ana@example.com')).toBe('');
  });

  it('formats phones', () => {
    expect(formatPhone('5511987654321')).toBe('+55 (11) 98765-4321');
    expect(formatPhone('551134567890')).toBe('+55 (11) 3456-7890');
    expect(formatPhone('14155550123')).toBe('+14155550123');
    expect(formatPhone('')).toBe('');
  });

  it('never shows a placeholder email', () => {
    expect(displayContact({ email: 'ana@example.com', phone: '5511987654321' })).toBe('ana@example.com');
    expect(displayContact({ email: placeholder, phone: '5511912345678' })).toBe('+55 (11) 91234-5678');
    expect(displayContact({ email: placeholder })).toBe('+55 (11) 98765-4321');
    expect(displayContact({ email: 'waX@phone.meuazulao.invalid' })).toBe('');
  });
});
