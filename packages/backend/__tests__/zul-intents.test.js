import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { route } from '../zul/intents.js';
import { toolCallToIntent, TOOLS, systemPrompt } from '../zul/ai.js';
import { createFakeAi } from './helpers/fakes.js';

const baseCtx = (over = {}) => ({
  state: { pending: null, last_confirmation: null, ...over.state },
  user: { id: 'u1' },
  lang: 'pt',
  currency: 'BRL',
  today: '2026-11-26',
  replyTarget: null,
  ...over,
});

describe('intent routing (model mocked)', () => {
  it('obvious expenses never call the model', async () => {
    const ai = createFakeAi();
    const intent = await route({ text: 'uber 23' }, baseCtx(), { ai });
    assert.equal(intent.type, 'expense');
    assert.equal(ai.calls.length, 0);
  });

  it('commands and language switches are local', async () => {
    const ai = createFakeAi();
    assert.equal((await route({ text: 'resumo' }, baseCtx(), { ai })).type, 'summary');
    assert.deepEqual(await route({ text: 'English' }, baseCtx(), { ai }), { type: 'language', language: 'en' });
    assert.equal(ai.calls.length, 0);
  });

  it('unclear messages go to the model', async () => {
    const ai = createFakeAi([{ type: 'off_topic' }]);
    const intent = await route({ text: 'qual a capital da França?' }, baseCtx(), { ai });
    assert.equal(intent.type, 'off_topic');
    assert.equal(ai.calls.length, 1);
  });

  it('low-confidence local expense asks the model for a better category', async () => {
    const modelIntent = { type: 'expense', items: [{ amount: 30, description: 'Xyz', category: 'leisure', confidence: 'high' }] };
    const ai = createFakeAi([modelIntent]);
    const intent = await route({ text: 'xyz 30' }, baseCtx(), { ai });
    assert.equal(intent.items[0].category, 'leisure');
    assert.equal(ai.calls.length, 1);
  });

  it('falls back to local parse when the model is down', async () => {
    const ai = { available: () => true, interpret: async () => { throw new Error('timeout'); } };
    const intent = await route({ text: 'xyz 30' }, baseCtx(), { ai });
    assert.equal(intent.type, 'expense');
    assert.equal(intent.items[0].category, 'other');
  });

  it('works without any model configured', async () => {
    const ai = { available: () => false };
    assert.equal((await route({ text: 'what is love' }, baseCtx(), { ai })).type, 'not_understood');
  });

  it('replying to a confirmation routes to a correction', async () => {
    const target = { kind: 'expense', ids: [1] };
    const ai = createFakeAi();
    const intent = await route({ text: 'foi 78' }, baseCtx({ replyTarget: target }), { ai });
    assert.deepEqual(intent, { type: 'correction', correction: { amount: 78 }, target });
    const del = await route({ text: 'borra' }, baseCtx({ replyTarget: target }), { ai });
    assert.equal(del.correction.delete, true);
  });

  it('recent confirmation allows "é lazer" without swiping to reply', async () => {
    const last = { kind: 'expense', ids: [5], at: new Date().toISOString() };
    const intent = await route({ text: 'é lazer' }, baseCtx({ state: { last_confirmation: last } }), { ai: createFakeAi() });
    assert.equal(intent.type, 'correction');
    assert.equal(intent.correction.categoryText, 'lazer');
  });

  it('category buttons become corrections', async () => {
    const target = { kind: 'expense', ids: [1] };
    const intent = await route({ buttonId: 'cat:leisure', text: 'Lazer' }, baseCtx({ replyTarget: target }), { ai: createFakeAi() });
    assert.deepEqual(intent.correction, { categoryKey: 'leisure' });
  });

  it('pending closing-day question takes a number', async () => {
    const ctx = baseCtx({ state: { pending: { type: 'closing_day', at: new Date().toISOString() } } });
    assert.deepEqual(await route({ text: 'dia 7' }, ctx, { ai: createFakeAi() }), { type: 'closing_day', day: 7 });
    const bad = baseCtx({ state: { pending: { type: 'closing_day' } } });
    assert.equal((await route({ text: '45' }, bad, { ai: createFakeAi() })).type, 'closing_day_invalid');
  });

  it('pending name question takes a name once', async () => {
    const ctx = baseCtx({ state: { pending: { type: 'ask_name' } } });
    assert.deepEqual(await route({ text: 'Felipe' }, ctx, { ai: createFakeAi() }), { type: 'name', name: 'Felipe' });
    const ctx2 = baseCtx({ state: { pending: { type: 'ask_name' } } });
    assert.equal((await route({ text: 'uber 23' }, ctx2, { ai: createFakeAi() })).type, 'expense');
    assert.equal(ctx2.state.pending, null);
  });
});

describe('tool calls -> intents', () => {
  it('every tool maps to an intent', () => {
    for (const tool of TOOLS) {
      const name = tool.function.name;
      const args = name === 'log_expenses' ? { items: [{ amount: 1, description: 'x', category: 'other', confidence: 'high' }] }
        : name === 'command' ? { name: 'help' } : { amount: 1, category: 'other', description: 'x', day_of_month: 1, language: 'en', currency: 'USD', name: 'A', period: 'today' };
      assert.ok(toolCallToIntent(name, args), name);
    }
  });
  it('installments from the model', () => {
    const intent = toolCallToIntent('log_expenses', { items: [{ amount: 2400, description: 'TV', category: 'shopping', confidence: 'high', installments: 10, card_name: 'Itaú' }] });
    assert.deepEqual([intent.type, intent.installments, intent.cardName], ['installments', 10, 'Itaú']);
  });
  it('system prompt restricts Zul to personal finance', () => {
    const prompt = systemPrompt({ today: '2026-11-26', lang: 'es', currency: 'MXN' });
    assert.match(prompt, /ONLY handle the user's personal finances/);
    assert.match(prompt, /off_topic/);
    assert.match(prompt, /Latin American Spanish/);
  });
});
