import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, parseLocal, parseCorrection, parseCommand, looksLikeName, findAmounts } from '../zul/parse.js';
import { guessCategory } from '../zul/categories.js';

describe('parseAmount (PT/ES/EN formats)', () => {
  const cases = [
    ['87,50', 87.5], ['87.50', 87.5], ['1.234,56', 1234.56], ['1,234.56', 1234.56], ['1.234', 1234], ['1,234', 1234],
    ['0,99', 0.99], ['12.5', 12.5], ['23', 23], ['R$ 10', 10], ['$45', 45], ['2k', 2000], ['2 mil', 2000], ['1.234.567,89', 1234567.89],
  ];
  for (const [input, expected] of cases) it(`${input} -> ${expected}`, () => assert.equal(parseAmount(input), expected));
  it('rejects non numbers', () => {
    assert.equal(parseAmount('abc'), null);
    assert.equal(parseAmount(''), null);
  });
  it('findAmounts skips installment counts and dates', () => {
    assert.deepEqual(findAmounts('tv 2400 em 10x').map((a) => a.value), [2400]);
    assert.deepEqual(findAmounts('dia 26/11 uber 23').map((a) => a.value), [23]);
  });
});

describe('parseLocal: obvious expenses resolve without the model', () => {
  const one = (text) => {
    const r = parseLocal(text);
    assert.equal(r?.type, 'expense', text);
    assert.equal(r.items.length, 1);
    return r.items[0];
  };
  it('"uber 23"', () => {
    const i = one('uber 23');
    assert.equal(i.amount, 23);
    assert.equal(i.description, 'Uber');
    assert.equal(i.category, 'transport');
    assert.equal(i.confidence, 'high');
  });
  it('"mercado 87,50"', () => {
    const i = one('mercado 87,50');
    assert.equal(i.amount, 87.5);
    assert.equal(i.category, 'groceries');
  });
  it('"groceries 45"', () => assert.equal(one('groceries 45').category, 'groceries'));
  it('"almuerzo 150" (es)', () => assert.equal(one('almuerzo 150').category, 'restaurants'));
  it('"spent 1,234.56 on rent" (en)', () => {
    const i = one('spent 1,234.56 on rent');
    assert.equal(i.amount, 1234.56);
    assert.equal(i.description, 'Rent');
    assert.equal(i.category, 'home');
  });
  it('payment method and card', () => {
    assert.equal(one('café 8,50 no pix').paymentMethod, 'pix');
    const c = one('pizza 45 no cartão nubank');
    assert.equal(c.paymentMethod, 'credit_card');
    assert.equal(c.cardName, 'Nubank');
  });
  it('yesterday', () => assert.equal(one('gastei 50 no mercado ontem').dayOffset, -1));
  it('several in one message', () => {
    const r = parseLocal('uber 23 e mercado 87,50');
    assert.equal(r.items.length, 2);
    assert.deepEqual(r.items.map((i) => i.amount), [23, 87.5]);
    const lines = parseLocal('gasolina 200\nmercado 150');
    assert.equal(lines.items.length, 2);
  });
  it('unknown description is low confidence', () => {
    const r = parseLocal('xyz 30');
    assert.equal(r.allHighConfidence, false);
    assert.equal(r.items[0].confidence, 'low');
  });
});

describe('parseLocal: other intents', () => {
  it('installments', () => {
    const r = parseLocal('tv 2400 em 10x no itaú');
    assert.equal(r.type, 'installments');
    assert.equal(r.amount, 2400);
    assert.equal(r.installments, 10);
    assert.equal(r.cardName, 'Itaú');
    assert.equal(r.description, 'Tv');
    const es = parseLocal('sushi 120 en 3 cuotas con bbva');
    assert.equal(es.installments, 3);
    assert.equal(es.cardName, 'Bbva');
  });
  it('recurring bill', () => {
    const r = parseLocal('aluguel 2500 todo dia 5');
    assert.deepEqual([r.type, r.amount, r.dayOfMonth, r.description], ['bill', 2500, 5, 'Aluguel']);
    assert.equal(parseLocal('renta 8000 todos los días 1').dayOfMonth, 1);
  });
  it('budget', () => {
    const r = parseLocal('limite 800 restaurante');
    assert.deepEqual([r.type, r.amount, r.category], ['budget', 800, 'restaurants']);
    assert.equal(parseLocal('presupuesto 3000 supermercado').category, 'groceries');
  });
  it('query', () => {
    assert.deepEqual(parseLocal('quanto gastei com uber esse mês?'), { type: 'query', term: 'uber', period: 'this_month' });
    assert.equal(parseLocal('how much did I spend on uber last month?').period, 'last_month');
    assert.equal(parseLocal('quanto gastei esse mês?').term, null);
  });
  it('income', () => {
    const r = parseLocal('recebi 3000 salário');
    assert.deepEqual([r.type, r.amount, r.category, r.description], ['income', 3000, 'salary', 'Salário']);
  });
  it('commands', () => {
    assert.equal(parseCommand('resumo').type, 'summary');
    assert.equal(parseCommand('Resumen').type, 'summary');
    assert.equal(parseCommand('summary').type, 'summary');
    assert.equal(parseCommand('painel').type, 'dashboard');
    assert.equal(parseCommand('app').type, 'dashboard');
    assert.equal(parseCommand('cancelar').type, 'cancel');
    assert.equal(parseCommand('menos mensagens').type, 'fewer');
    assert.deepEqual(parseCommand('moeda usd'), { type: 'currency', currency: 'USD' });
    assert.deepEqual(parseCommand('entrar abc123'), { type: 'join', code: 'ABC123' });
  });
  it('off-topic questions are left to the model', () => {
    assert.equal(parseLocal('what is the capital of France?'), null);
  });
});

describe('parseCorrection', () => {
  it('amount', () => {
    assert.deepEqual(parseCorrection('foi 78'), { amount: 78 });
    assert.deepEqual(parseCorrection('it was 12.50'), { amount: 12.5 });
    assert.deepEqual(parseCorrection('78'), { amount: 78 });
  });
  it('category', () => {
    assert.deepEqual(parseCorrection('é lazer'), { categoryText: 'lazer' });
    assert.deepEqual(parseCorrection('es ocio'), { categoryText: 'ocio' });
    assert.deepEqual(parseCorrection('lazer'), { categoryText: 'lazer' });
  });
  it('delete in three languages', () => {
    for (const w of ['apaga', 'apagar', 'borra', 'borrar', 'delete', 'Apaga!']) assert.deepEqual(parseCorrection(w), { delete: true }, w);
  });
  it('payment', () => {
    assert.deepEqual(parseCorrection('era no cartão'), { paymentMethod: 'credit_card', cardName: null });
    assert.deepEqual(parseCorrection('era no cartão itaú'), { paymentMethod: 'credit_card', cardName: 'Itaú' });
  });
  it('date', () => assert.deepEqual(parseCorrection('foi ontem'), { dayOffset: -1 }));
  it('not a correction', () => assert.equal(parseCorrection('uber 23'), null));
});

describe('helpers', () => {
  it('looksLikeName', () => {
    assert.equal(looksLikeName('felipe'), 'Felipe');
    assert.equal(looksLikeName('me chamo ana maria'), 'Ana Maria');
    assert.equal(looksLikeName('uber 23'), null);
    assert.equal(looksLikeName('resumo'), null);
  });
  it('guessCategory prefers the longest keyword', () => {
    assert.equal(guessCategory('uber eats').key, 'restaurants');
    assert.equal(guessCategory('uber').key, 'transport');
  });
});
