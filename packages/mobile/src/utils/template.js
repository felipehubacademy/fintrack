/**
 * Splits a translated sentence around one {{placeholder}} so the value can be
 * rendered differently (e.g. a bold number inside a sentence).
 *
 * t('dashboard.hero.perDay', { day: '30th' }) leaves {{amount}} untouched:
 * splitTemplate('You can spend {{amount}} a day until the 30th', 'amount')
 *   -> ['You can spend ', ' a day until the 30th']
 * If the placeholder is missing, the whole text is returned as `before`.
 */
export function splitTemplate(text, name) {
  const str = String(text ?? '');
  const re = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`);
  const match = str.match(re);
  if (!match) return [str, ''];
  return [str.slice(0, match.index), str.slice(match.index + match[0].length)];
}
