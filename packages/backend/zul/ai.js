/**
 * OpenAI access: Chat Completions with tool calling (model from ZUL_MODEL,
 * default gpt-4o-mini), whisper-1 for voice notes and the same chat model
 * (vision) for receipt photos. The Assistants API is not used.
 *
 * interpret*() always returns an intent in the same shape parse.js produces,
 * or null when the model is unavailable.
 */
import OpenAI, { toFile } from 'openai';
import { EXPENSE_CATEGORIES, INCOME_KEYS, EXPENSE_KEYS } from './categories.js';
import { SUPPORTED_CURRENCIES } from './language.js';

const PAYMENT_METHODS = ['credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other'];
const PERIODS = ['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'this_year'];
const COMMANDS = ['help', 'dashboard', 'plan', 'cancel', 'fewer_messages', 'more_messages', 'invite_partner', 'greeting', 'thanks'];

const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } },
});

export const TOOLS = [
  fn('log_expenses', 'Record one or more expenses the user already paid. Use one item per purchase. For installment purchases set installments.', {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Total amount, decimal point (87,50 -> 87.5)' },
          description: { type: 'string', description: 'Short description in the user words, e.g. "Mercado", "Uber"' },
          category: { type: 'string', enum: EXPENSE_KEYS },
          confidence: { type: 'string', enum: ['high', 'low'], description: 'low when the category is a guess' },
          alternatives: { type: 'array', items: { type: 'string', enum: EXPENSE_KEYS }, description: 'Up to 3 other likely categories when confidence is low' },
          payment_method: { type: 'string', enum: PAYMENT_METHODS },
          card_name: { type: 'string', description: 'Card or bank name when mentioned (e.g. "Nubank", "Itaú")' },
          date: { type: 'string', description: 'YYYY-MM-DD if not today' },
          installments: { type: 'integer', description: 'Number of installments (parcelas/cuotas) when > 1' },
        },
        required: ['amount', 'description', 'category', 'confidence'],
      },
    },
  }, ['items']),
  fn('log_income', 'Record money the user received (salary, freelance, sale, refund).', {
    amount: { type: 'number' },
    description: { type: 'string' },
    category: { type: 'string', enum: INCOME_KEYS },
    date: { type: 'string', description: 'YYYY-MM-DD if not today' },
  }, ['amount', 'category']),
  fn('correct_last', 'Fix or delete the last record (e.g. "foi 78", "é lazer", "apaga", "era no cartão").', {
    delete: { type: 'boolean' },
    amount: { type: 'number' },
    category: { type: 'string', description: 'Category name as the user said it' },
    payment_method: { type: 'string', enum: PAYMENT_METHODS },
    card_name: { type: 'string' },
    date: { type: 'string', description: 'YYYY-MM-DD' },
  }),
  fn('recurring_bill', 'Register a recurring bill to pay every month (e.g. "aluguel 2500 todo dia 5").', {
    description: { type: 'string' },
    amount: { type: 'number' },
    day_of_month: { type: 'integer', minimum: 1, maximum: 31 },
    category: { type: 'string', enum: EXPENSE_KEYS },
  }, ['description', 'amount', 'day_of_month']),
  fn('set_budget', 'Set a monthly spending limit for a category (e.g. "limite 800 restaurante").', {
    category: { type: 'string', description: 'Category as the user said it' },
    category_key: { type: 'string', enum: EXPENSE_KEYS },
    amount: { type: 'number' },
  }, ['category', 'amount']),
  fn('spending_query', 'Answer how much the user spent, optionally on something specific.', {
    term: { type: 'string', description: 'What they ask about (merchant or description), e.g. "uber"' },
    category: { type: 'string', enum: EXPENSE_KEYS },
    period: { type: 'string', enum: PERIODS },
  }, ['period']),
  fn('summary', 'Monthly summary of spending, income and budgets.'),
  fn('command', 'Simple app commands.', { name: { type: 'string', enum: COMMANDS } }, ['name']),
  fn('set_language', 'User wants to talk in another language.', { language: { type: 'string', enum: ['en', 'pt', 'es'] } }, ['language']),
  fn('set_currency', 'User wants to change their currency.', { currency: { type: 'string', enum: SUPPORTED_CURRENCIES } }, ['currency']),
  fn('set_name', 'User tells their name.', { name: { type: 'string' } }, ['name']),
  fn('off_topic', 'Anything not about the user personal finances (general questions, chit-chat, coding, news, advice unrelated to their money).'),
];

const LANG_NAME = { en: 'English', pt: 'Brazilian Portuguese', es: 'Latin American Spanish' };

export function systemPrompt(ctx) {
  const cats = EXPENSE_CATEGORIES.map((c) => `${c.key} (${c.names.pt[0]} / ${c.names.es[0]} / ${c.names.en[0]})`).join(', ');
  return [
    'You are Zul, the WhatsApp assistant of MeuAzulão, a personal finance app.',
    'You ONLY handle the user\'s personal finances: logging expenses and income, installments, bills, budgets, questions about their own spending.',
    'Always answer by calling exactly one tool. Never write free text.',
    'Anything else (general knowledge, recipes, coding, news, jokes, other services) -> off_topic.',
    `Today is ${ctx.today}. The user writes in ${LANG_NAME[ctx.lang] || 'English'} and uses ${ctx.currency}.`,
    'Amounts may use comma or dot as decimal separator: "87,50" = 87.5, "1.234,56" = 1234.56, "2k" = 2000.',
    `Expense categories: ${cats}.`,
    'Set confidence "low" when the category is a guess and give up to 3 alternatives.',
    'Installments: "tv 2400 em 10x no itaú" -> one item, amount 2400 (total), installments 10, card_name "Itaú", payment_method credit_card.',
    'Receipt photo: log the total as one expense, description = merchant name.',
    ctx.replyingToConfirmation ? 'The user is replying to a confirmation of their last record, so corrections go to correct_last.' : '',
  ].filter(Boolean).join('\n');
}

/** Tool call -> intent (same shape as parse.js). */
export function toolCallToIntent(name, args = {}) {
  switch (name) {
    case 'log_expenses': {
      const items = (args.items || []).filter((i) => Number(i.amount) > 0);
      if (!items.length) return null;
      const inst = items.find((i) => Number(i.installments) > 1);
      if (inst) {
        return {
          type: 'installments', description: inst.description, amount: Number(inst.amount), installments: Number(inst.installments),
          cardName: inst.card_name || null, category: inst.category, confidence: inst.confidence || 'high', alternatives: inst.alternatives || [],
        };
      }
      return {
        type: 'expense',
        source: 'model',
        items: items.map((i) => ({
          amount: Number(i.amount),
          description: i.description,
          category: EXPENSE_KEYS.includes(i.category) ? i.category : 'other',
          confidence: i.confidence || 'high',
          alternatives: (i.alternatives || []).filter((k) => EXPENSE_KEYS.includes(k)).slice(0, 3),
          paymentMethod: PAYMENT_METHODS.includes(i.payment_method) ? i.payment_method : null,
          cardName: i.card_name || null,
          date: /^\d{4}-\d{2}-\d{2}$/.test(i.date || '') ? i.date : null,
        })),
      };
    }
    case 'log_income':
      return { type: 'income', amount: Number(args.amount), description: args.description || null, category: args.category || 'other_income', date: args.date || null };
    case 'correct_last':
      return {
        type: 'correction',
        correction: {
          delete: !!args.delete,
          amount: args.amount ? Number(args.amount) : undefined,
          categoryText: args.category || undefined,
          paymentMethod: args.payment_method || undefined,
          cardName: args.card_name || undefined,
          date: args.date || undefined,
        },
      };
    case 'recurring_bill':
      return { type: 'bill', description: args.description, amount: Number(args.amount), dayOfMonth: Number(args.day_of_month), recurring: true, category: args.category || 'other' };
    case 'set_budget':
      return { type: 'budget', amount: Number(args.amount), categoryText: args.category, category: args.category_key || null };
    case 'spending_query':
      return { type: 'query', term: args.term || null, category: args.category || null, period: args.period || 'this_month' };
    case 'summary':
      return { type: 'summary' };
    case 'command': {
      const map = { fewer_messages: 'fewer', more_messages: 'more', invite_partner: 'invite' };
      return { type: map[args.name] || args.name };
    }
    case 'set_language':
      return { type: 'language', language: args.language };
    case 'set_currency':
      return { type: 'currency', currency: args.currency };
    case 'set_name':
      return { type: 'name', name: args.name };
    case 'off_topic':
      return { type: 'off_topic' };
    default:
      return null;
  }
}

export function createAi({ client = null, model = process.env.ZUL_MODEL || 'gpt-4o-mini' } = {}) {
  let openai = client;
  const getClient = () => {
    if (!openai && process.env.OPENAI_API_KEY) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
  };

  async function run(messages) {
    const c = getClient();
    if (!c) return null;
    const res = await c.chat.completions.create({
      model,
      messages,
      tools: TOOLS,
      tool_choice: 'required',
      parallel_tool_calls: false,
      temperature: 0,
    });
    const call = res.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return null;
    let args = {};
    try {
      args = JSON.parse(call.function.arguments || '{}');
    } catch (_) {
      return null;
    }
    return toolCallToIntent(call.function.name, args);
  }

  return {
    available: () => !!getClient(),

    async interpret(text, ctx) {
      return run([
        { role: 'system', content: systemPrompt(ctx) },
        { role: 'user', content: String(text).slice(0, 2000) },
      ]);
    },

    async interpretImage(buffer, mimeType, caption, ctx) {
      const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${Buffer.from(buffer).toString('base64')}`;
      return run([
        { role: 'system', content: systemPrompt(ctx) },
        {
          role: 'user',
          content: [
            { type: 'text', text: caption ? `Receipt photo. Caption: ${caption}` : 'Receipt photo.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          ],
        },
      ]);
    },

    async transcribe(buffer, mimeType, lang) {
      const c = getClient();
      if (!c) return null;
      const ext = /mpeg|mp3/.test(mimeType || '') ? 'mp3' : /mp4|m4a|aac/.test(mimeType || '') ? 'm4a' : 'ogg';
      const file = await toFile(Buffer.from(buffer), `voice.${ext}`, { type: mimeType || 'audio/ogg' });
      const res = await c.audio.transcriptions.create({ file, model: 'whisper-1', language: lang || undefined });
      return (res.text || '').trim();
    },
  };
}
