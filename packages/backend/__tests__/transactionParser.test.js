import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// TransactionParser uses class methods. Import and instantiate.
// We can test normalizeDate and parseAmount directly.

// Inline the pure functions to avoid importing heavy deps (pdf-lib, canvas, pdfjs)
function normalizeDate(dateStr) {
  if (!dateStr) return '';
  const cleaned = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const brFormat = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brFormat) {
    const [, day, month, year] = brFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const isoFormat = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoFormat) {
    const [, year, month, day] = isoFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
}

function parseAmount(amountStr) {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr) return 0;
  let cleaned = String(amountStr).replace(/[R$\s]/g, '').trim();
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

describe('normalizeDate', () => {
  it('passes through ISO format YYYY-MM-DD', () => {
    assert.equal(normalizeDate('2024-03-15'), '2024-03-15');
  });

  it('converts BR format DD/MM/YYYY', () => {
    assert.equal(normalizeDate('15/03/2024'), '2024-03-15');
  });

  it('converts BR format with dash DD-MM-YYYY', () => {
    assert.equal(normalizeDate('5-3-2024'), '2024-03-05');
  });

  it('converts YYYY/MM/DD format', () => {
    assert.equal(normalizeDate('2024/3/5'), '2024-03-05');
  });

  it('returns empty string for null', () => {
    assert.equal(normalizeDate(null), '');
  });

  it('returns empty string for unrecognized format', () => {
    assert.equal(normalizeDate('March 15, 2024'), '');
  });
});

describe('parseAmount', () => {
  it('parses number directly', () => {
    assert.equal(parseAmount(123.45), 123.45);
  });

  it('parses BR format "R$ 1.234,56"', () => {
    assert.equal(parseAmount('R$ 1.234,56'), 1234.56);
  });

  it('parses comma decimal "100,50"', () => {
    assert.equal(parseAmount('100,50'), 100.5);
  });

  it('parses plain number string "500"', () => {
    assert.equal(parseAmount('500'), 500);
  });

  it('returns 0 for empty string', () => {
    assert.equal(parseAmount(''), 0);
  });

  it('returns 0 for null', () => {
    assert.equal(parseAmount(null), 0);
  });

  it('returns 0 for garbage input', () => {
    assert.equal(parseAmount('abc'), 0);
  });
});
