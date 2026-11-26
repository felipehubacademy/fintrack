// Every key must exist in en, pt and es, so no screen shows a raw key
// or silently falls back to English in one market.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from './locales/en/index.js';
import pt from './locales/pt/index.js';
import es from './locales/es/index.js';

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  ));
}

const all = { en: new Set(keys(en)), pt: new Set(keys(pt)), es: new Set(keys(es)) };

for (const [lang, set] of Object.entries(all)) {
  test(`${lang} has every key the other languages have`, () => {
    const missing = [];
    for (const [other, otherSet] of Object.entries(all)) {
      if (other === lang) continue;
      for (const k of otherSet) if (!set.has(k)) missing.push(`${k} (in ${other})`);
    }
    assert.deepEqual([...new Set(missing)], []);
  });
}
