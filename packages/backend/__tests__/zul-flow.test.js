import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createZul } from '../zul/index.js';
import { createFakeDb, createFakeWa, createFakeAi, textMessage } from './helpers/fakes.js';

const BR = '5511987654321';
const MX = '5215512345678';
const US = '14155551234';
const fixedNow = () => new Date('2026-11-26T15:00:00Z');

function setup(aiResponses = []) {
  const db = createFakeDb();
  const wa = createFakeWa();
  const ai = createFakeAi(aiResponses);
  const zul = createZul({ db, wa, ai, now: fixedNow });
  const say = async (from, body, opts) => {
    const before = wa.sent.length;
    await zul.handleMessage(textMessage(from, body, opts), { wa_id: from, profile: { name: 'Fê' } });
    return wa.sent.slice(before);
  };
  return { db, wa, ai, zul, say };
}

describe('onboarding without the app', () => {
  it('first message from an unknown number gets one intro message, no account yet', async () => {
    const { db, say } = setup();
    const out = await say(BR, 'oi');
    assert.equal(out.length, 1);
    assert.match(out[0].body, /Zul/);
    assert.match(out[0].body, /mercado 87,50/);
    assert.equal(db.tables.users.length, 0);
  });

  it('first expense is recorded right away, account auto-created, then asks the name', async () => {
    const { db, say } = setup();
    const out = await say(BR, 'mercado 87,50');
    assert.equal(db.tables.users.length, 1);
    assert.equal(db.tables.expenses.length, 1);
    assert.equal(db.tables.expenses[0].amount, 87.5);
    assert.equal(db.tables.expenses[0].category, 'Mercado');
    assert.equal(db.tables.expenses[0].source, 'whatsapp');
    assert.match(out[0].body, /✅ R\$ 87,50 em Mercado, hoje\./);
    assert.match(out[0].body, /Errou\? Responda com a categoria ou apagar\./);
    assert.match(out[1].body, /Como posso te chamar\?/);
    assert.match(out[1].body, /BRL/);

    const named = await say(BR, 'Felipe');
    assert.match(named[0].body, /Prazer, Felipe!/);
    assert.equal(db.tables.users[0].name, 'Felipe');
  });

  it('third record sends the dashboard link and offers a partner invite', async () => {
    const { say } = setup();
    await say(BR, 'uber 23');
    await say(BR, 'Felipe');
    await say(BR, 'mercado 50');
    const out = await say(BR, 'café 8');
    const last = out[out.length - 1].body;
    assert.match(last, /https:\/\/meuazulao\.com\.br\/login\?phone=%2B5511987654321/);
    assert.match(last, /convidar/);
  });

  it('Spanish and English by country code, with local currency', async () => {
    const mx = setup();
    const es = await mx.say(MX, 'súper 87,50');
    assert.match(es[0].body, /✅ \$87\.50 en Supermercado \(Súper\), hoy\./);
    assert.match(es[0].body, /¿Algo mal\? Responde con la categoría o borrar\./);
    const us = setup();
    const en = await us.say(US, 'groceries 45');
    assert.match(en[0].body, /✅ \$45\.00 on Groceries, today\./);
    assert.match(en[0].body, /Wrong\? Reply with the category or delete\./);
  });

  it('language can be switched and is stored', async () => {
    const { db, say } = setup();
    await say(BR, 'uber 10');
    const out = await say(BR, 'English');
    assert.match(out[0].body, /English/);
    assert.equal(db.tables.conversations.get(BR).language, 'en');
    const next = await say(BR, 'uber 12');
    assert.match(next[0].body, /on Transporte|on Transportation/);
  });
});

describe('corrections by replying to the confirmation', () => {
  it('"foi 78", "é lazer" and "apaga"', async () => {
    const { db, wa, say } = setup();
    await say(BR, 'mercado 87,50');
    const confirmation = wa.sent[0].id;
    await say(BR, 'Felipe');

    const fixed = await say(BR, 'foi 78', { context: confirmation });
    assert.equal(db.tables.expenses[0].amount, 78);
    assert.match(fixed[0].body, /R\$ 78,00/);

    await say(BR, 'é lazer', { context: confirmation });
    assert.equal(db.tables.expenses[0].category, 'Lazer');

    const del = await say(BR, 'apaga', { context: confirmation });
    assert.equal(db.tables.expenses.length, 0);
    assert.match(del[0].body, /Apagado/);
  });

  it('"apaga" without anything to fix', async () => {
    const { db, say } = setup();
    await say(BR, 'uber 5');
    await say(BR, 'Ana');
    db.tables.conversations.get(BR).last_confirmation = null;
    const out = await say(BR, 'apaga');
    assert.match(out[0].body, /Não achei o que corrigir/);
    assert.equal(db.tables.expenses.length, 1);
  });

  it('several expenses in one message -> one confirmation', async () => {
    const { db, say } = setup();
    const out = await say(BR, 'uber 23 e mercado 87,50');
    assert.equal(db.tables.expenses.length, 2);
    assert.match(out[0].body, /Anotei 2 gastos/);
    assert.match(out[0].body, /Total: R\$ 110,50/);
  });

  it('low confidence shows category buttons', async () => {
    const { wa, say } = setup([null]);
    await say(BR, 'xyz 30');
    assert.ok(wa.sent[0].buttons?.length >= 2);
    assert.ok(wa.sent[0].buttons.every((b) => b.id.startsWith('cat:') && b.title.length <= 20));
  });
});

describe('installments, bills, budgets, queries', () => {
  it('asks the closing day once per card, then creates N installments', async () => {
    const { db, say } = setup();
    await say(BR, 'uber 1');
    await say(BR, 'Felipe');
    const ask = await say(BR, 'tv 2400 em 10x no itaú');
    assert.match(ask[0].body, /Qual dia fecha a fatura do cartão Itaú/);
    const done = await say(BR, '5');
    const tv = db.tables.expenses.filter((e) => e.description === 'Tv');
    assert.equal(tv.length, 10);
    assert.equal(tv[0].amount, 240);
    assert.equal(tv[9].date, '2027-08-26');
    assert.match(done[0].body, /10x de R\$ 240,00 no cartão Itaú/);
    assert.match(done[0].body, /fatura de Dezembro/);
    const again = await say(BR, 'celular 1200 em 3x no itau');
    assert.match(again[0].body, /3x de R\$ 400,00/);
  });

  it('recurring bill and budget with remaining amount on confirmations', async () => {
    const { db, say } = setup();
    await say(BR, 'restaurante 100');
    await say(BR, 'Felipe');
    const bill = await say(BR, 'aluguel 2500 todo dia 5');
    assert.equal(db.tables.bills[0].due_date, '2026-12-05');
    assert.equal(db.tables.bills[0].is_recurring, true);
    assert.match(bill[0].body, /todo dia 5/);
    const budget = await say(BR, 'limite 800 restaurante');
    assert.match(budget[0].body, /Limite de R\$ 800,00 para Restaurante/);
    assert.match(budget[0].body, /restam R\$ 700,00/);
    const next = await say(BR, 'pizza 50');
    assert.match(next[0].body, /Restam R\$ 650,00 do limite de Restaurante/);
  });

  it('queries and summary', async () => {
    const { say } = setup();
    await say(BR, 'uber 23');
    await say(BR, 'Felipe');
    await say(BR, 'uber 7');
    const q = await say(BR, 'quanto gastei com uber esse mês?');
    assert.match(q[0].body, /R\$ 30,00/);
    assert.match(q[0].body, /2 registros/);
    const s = await say(BR, 'resumo');
    assert.match(s[0].body, /Resumo de Novembro/);
    assert.match(s[0].body, /Gastos: \*R\$ 30,00\*/);
  });

  it('plan / cancel explain early access', async () => {
    const { say } = setup();
    await say(BR, 'uber 1');
    assert.match((await say(BR, 'cancelar'))[0].body, /nada pra cancelar/);
    assert.match((await say(BR, 'plano'))[0].body, /31\/01\/2027/);
  });

  it('off-topic gets a short redirect', async () => {
    const { say } = setup([{ type: 'off_topic' }]);
    await say(BR, 'uber 1');
    await say(BR, 'Felipe');
    const out = await say(BR, 'me conta uma piada');
    assert.match(out[0].body, /só ajudo com suas finanças pessoais/);
  });
});

describe('idempotency', () => {
  it('the same WhatsApp message id is processed once', async () => {
    const { db, wa, zul } = setup();
    const msg = textMessage(BR, 'uber 23', { id: 'wamid.SAME' });
    assert.equal(await zul.handleMessage(msg), 'done');
    assert.equal(await zul.handleMessage(msg), 'duplicate');
    assert.equal(db.tables.expenses.length, 1);
    assert.equal(wa.sent.filter((s) => s.body.includes('✅')).length, 1);
  });

  it('status callbacks and reactions are ignored', async () => {
    const { wa, zul } = setup();
    await zul.handlePayload({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: 'x', status: 'read' }] } }] }] });
    await zul.handleMessage({ from: BR, id: 'wamid.r', type: 'reaction', reaction: { emoji: '👍' } });
    assert.equal(wa.sent.length, 0);
  });
});
