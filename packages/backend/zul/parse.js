/**
 * Local (no-model) parsing: amounts, obvious expenses, commands, corrections,
 * installments, recurring bills, budgets, simple queries.
 *
 * Every function is pure and synchronous so it can be unit-tested.
 */
import { normalizeText, SUPPORTED_CURRENCIES } from './language.js';
import { guessCategory, findCategoryKeyByName } from './categories.js';

// ---------------------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------------------

/**
 * '87,50' -> 87.5 | '87.50' -> 87.5 | '1.234,56' -> 1234.56 | '1,234.56' -> 1234.56
 * '1.234' -> 1234 | '2k' -> 2000 | '2 mil' -> 2000. Returns null when not a number.
 */
export function parseAmount(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  let s = String(input || '').trim().toLowerCase();
  if (!s) return null;
  let multiplier = 1;
  const suffix = s.match(/\s*(k|mil)$/);
  if (suffix) {
    multiplier = 1000;
    s = s.slice(0, suffix.index);
  }
  s = s.replace(/^(r\$|us\$|u\$s|usd|brl|mxn|cop|ars|clp|pen|\$|€|£)\s*/, '').replace(/\s+/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalized;
  if (lastDot >= 0 && lastComma >= 0) {
    // Both separators: the last one is the decimal separator.
    const dec = lastDot > lastComma ? '.' : ',';
    const thousands = dec === '.' ? ',' : '.';
    normalized = s.split(thousands).join('').replace(dec, '.');
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = s.split(sep);
    const tail = parts[parts.length - 1];
    if (parts.length > 2 || (tail.length === 3 && parts[0].length <= 3 && parts[0] !== '0')) {
      normalized = parts.join(''); // thousands separator(s)
    } else {
      normalized = `${parts.slice(0, -1).join('')}.${tail}`;
    }
  } else {
    normalized = s;
  }
  const value = Number.parseFloat(normalized) * multiplier;
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

const AMOUNT_RE = /(?:(?:r\$|us\$|\$|€|£)\s?)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s?(?:k|mil)(?![\p{L}]))?/giu;

/** All amounts in a text with their position. Ignores "10x", "dia 5", dates. */
export function findAmounts(text) {
  const out = [];
  const src = String(text || '');
  for (const m of src.matchAll(AMOUNT_RE)) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    const after = src.slice(end, end + 1);
    const before = src.slice(Math.max(0, start - 1), start);
    if (/^[x×]/i.test(after) && !m[2]) continue; // "10x"
    if (/[/:]/.test(after) || /[/:]/.test(before)) continue; // dates, times
    if (/\p{L}/u.test(before) && !/[$€£]/.test(raw)) continue; // "99pop", "b2b"
    if (/^\p{L}/u.test(after) && !m[2] && !/^(r|h)\b/i.test(after)) continue; // "5th", "2nd"
    const value = parseAmount(`${m[1]}${m[2] ? m[2].trim() : ''}`);
    if (value == null || value <= 0) continue;
    out.push({ value, raw, start, end });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const FILLER = new Set([
  // pt
  'gastei', 'paguei', 'comprei', 'gasto', 'foi', 'deu', 'com', 'no', 'na', 'nos', 'nas', 'em', 'de', 'do', 'da', 'dos', 'das',
  'um', 'uma', 'o', 'a', 'os', 'as', 'pra', 'para', 'por', 'reais', 'real', 'conto', 'contos', 'hoje', 'r', 'e', 'mais',
  // es
  'gaste', 'pague', 'compre', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'del', 'con', 'pesos', 'soles', 'hoy', 'y',
  // en
  'spent', 'paid', 'bought', 'on', 'at', 'for', 'the', 'an', 'of', 'dollars', 'bucks', 'today', 'usd', 'and', 'i', 'my', 'some',
]);

const YESTERDAY = ['ontem', 'ayer', 'yesterday'];
const BEFORE_YESTERDAY = ['anteontem', 'anteayer'];

const PAYMENT_WORDS = [
  { re: /\bpix\b/, method: 'pix' },
  { re: /\b(dinheiro|especie|cash|efectivo|em maos)\b/, method: 'cash' },
  { re: /\b(debito|debit)\b/, method: 'debit_card' },
  { re: /\b(credito|credit|cartao|tarjeta|card)\b/, method: 'credit_card' },
  { re: /\b(boleto)\b/, method: 'boleto' },
  { re: /\b(transferencia|transfer|ted)\b/, method: 'bank_transfer' },
];
const PAYMENT_TOKENS = new Set(['pix', 'dinheiro', 'especie', 'cash', 'efectivo', 'debito', 'debit', 'credito', 'credit',
  'cartao', 'tarjeta', 'card', 'boleto', 'transferencia', 'transfer', 'ted', 'maos']);

export function detectPaymentMethod(text) {
  const n = normalizeText(text);
  for (const { re, method } of PAYMENT_WORDS) if (re.test(n)) return method;
  return null;
}

/** "no cartão nubank" / "tarjeta bbva" / "on chase card" -> "nubank" */
export function detectCardName(text) {
  const n = normalizeText(text);
  const m = n.match(/\b(?:cartao|tarjeta|card)(?: de credito| credito| credit)?\s+(?:do |da |de |del |the )?([a-z0-9][a-z0-9 ]{0,20}?)\s*$/)
    || n.match(/\b(?:no|na|en|on|com|con|with)\s+(?:o |a |el |la |the |my |meu |minha |mi )?([a-z0-9][a-z0-9]{1,20})(?: card| credit card)?\s*$/);
  if (!m) return null;
  const name = m[1].trim();
  if (!name || PAYMENT_TOKENS.has(name) || FILLER.has(name)) return null;
  return name;
}

function cleanDescription(text) {
  const words = String(text || '')
    .replace(/[!?¿¡.;:"“”]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => {
    const n = normalizeText(w).replace(/[^a-z0-9$]/g, '');
    if (!n) return false;
    if (/^[r]?\$$/.test(n) || n === 'us$') return false;
    return !FILLER.has(n) && !YESTERDAY.includes(n) && !BEFORE_YESTERDAY.includes(n) && !PAYMENT_TOKENS.has(n);
  });
  const desc = kept.join(' ').replace(/^[-,\s]+|[-,\s]+$/g, '');
  return desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : '';
}

/** Put accents/case back: description built from normalized text -> words as typed. */
function restoreWords(desc, raw) {
  if (!desc) return desc;
  const map = new Map();
  for (const w of String(raw).split(/\s+/)) {
    const clean = w.replace(/[!?¿¡.,;:"“”]+$/g, '').replace(/^[¿¡"“]+/, '');
    const key = normalizeText(clean);
    if (key && !map.has(key)) map.set(key, clean);
  }
  const out = desc.split(' ').map((w) => map.get(normalizeText(w)) || w).join(' ');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function dayOffset(text) {
  const n = normalizeText(text);
  if (BEFORE_YESTERDAY.some((w) => n.includes(w)) || n.includes('day before yesterday')) return -2;
  if (YESTERDAY.some((w) => new RegExp(`\\b${w}\\b`).test(n))) return -1;
  return 0;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const COMMANDS = {
  help: ['ajuda', 'help', 'ayuda', 'menu', 'comandos', 'commands', '?', 'como funciona', 'como usar', 'how does it work', 'o que voce faz', 'que haces', 'what can you do'],
  summary: ['resumo', 'resumen', 'summary', 'resumo do mes', 'resumen del mes', 'monthly summary', 'month summary', 'meu resumo', 'mi resumen', 'my summary'],
  dashboard: ['painel', 'app', 'dashboard', 'panel', 'site', 'link', 'aplicativo', 'aplicacion', 'web', 'meu painel', 'mi panel', 'my dashboard'],
  plan: ['plano', 'plan', 'planos', 'planes', 'plans', 'preco', 'precio', 'price', 'pricing', 'quanto custa', 'cuanto cuesta', 'how much does it cost', 'assinatura', 'suscripcion', 'subscription', 'premium', 'pagar', 'pago',
    'assinar', 'assine', 'quero assinar', 'assinar plus', 'assinar o plus', 'plus', 'meu plano', 'minha assinatura',
    'suscribirme', 'suscribirse', 'suscribir', 'quiero suscribirme', 'suscribirme a plus', 'mi plan', 'mi suscripcion',
    'subscribe', 'i want to subscribe', 'subscribe to plus', 'my plan', 'my subscription', 'upgrade'],
  cancel: ['cancelar', 'cancel', 'cancelar assinatura', 'cancelar plano', 'cancel subscription', 'cancelar suscripcion', 'unsubscribe', 'cancel plan'],
  fewer: ['menos mensagens', 'menos mensajes', 'fewer messages', 'less messages', 'modo silencioso', 'quiet mode', 'silencio'],
  more: ['mais mensagens', 'mas mensajes', 'more messages'],
  invite: ['convidar', 'invitar', 'invite', 'convidar parceiro', 'convidar parceira', 'convidar alguem', 'invite partner', 'invitar pareja', 'invitar a alguien'],
  greeting: ['oi', 'ola', 'hola', 'hi', 'hello', 'hey', 'bom dia', 'boa tarde', 'boa noite', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'good morning', 'good afternoon', 'good evening', 'e ai', 'opa', 'oie', 'oii', 'start', 'comecar', 'empezar'],
  thanks: ['obrigado', 'obrigada', 'valeu', 'vlw', 'gracias', 'thanks', 'thank you', 'thx', 'ok', 'okay', 'beleza', 'blz', 'show', 'perfeito', 'perfecto', 'perfect', 'top', 'dale', 'listo', 'certo', 'great', 'cool'],
};

// "apagar minha conta", "eliminar mi cuenta", "delete my account": we only send the link.
const DELETE_ACCOUNT_RE = /^(?:quero |quiero |i want to |please |por favor )?(?:apagar|apaga|excluir|exclui|deletar|deleta|encerrar|cancelar|eliminar|elimina|borrar|borra|cerrar|delete|close|remove)\s+(?:a |la |my |minha |mi |meu |o )?(?:conta|cuenta|account|cadastro)(?: (?:do|de|no|en|on) (?:azulao|meu azulao|zul|whatsapp))?$/;

/** Exact-ish command detection. Returns { type, ... } or null. */
export function parseCommand(text) {
  const n = normalizeText(text).replace(/[!.¡¿,]+/g, '').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  if (DELETE_ACCOUNT_RE.test(n)) return { type: 'delete_account' };
  for (const [type, words] of Object.entries(COMMANDS)) {
    if (words.includes(n)) return { type };
  }
  if (/^[\p{Extended_Pictographic}\s]+$/u.test(text.trim())) return { type: 'thanks' };
  const currency = n.match(/^(?:moeda|moneda|currency)\s+([a-z]{3})$/);
  if (currency) {
    const code = currency[1].toUpperCase();
    return SUPPORTED_CURRENCIES.includes(code) ? { type: 'currency', currency: code } : { type: 'currency', currency: null };
  }
  const join = n.match(/^(?:entrar|join|unirme|unir|unirse)\s+([a-z0-9]{4,10})$/);
  if (join) return { type: 'join', code: join[1].toUpperCase() };
  return null;
}

// ---------------------------------------------------------------------------
// Corrections (replying to a confirmation)
// ---------------------------------------------------------------------------

const DELETE_WORDS = ['apaga', 'apagar', 'apague', 'deleta', 'deletar', 'exclui', 'excluir', 'remove', 'remover', 'borra', 'borrar',
  'borralo', 'elimina', 'eliminar', 'delete', 'delete it', 'undo', 'desfaz', 'desfazer', 'deshacer', 'cancela', 'apaga isso', 'apaga esse',
  'borra eso', 'remove it', 'nao foi isso', 'errado apaga', 'apagar esse', 'apagar isso'];

/**
 * Parse a correction. Returns null when the text doesn't look like one.
 * { delete: true } | { amount } | { categoryText } | { paymentMethod, cardName } | { dayOffset }
 */
export function parseCorrection(text) {
  const raw = String(text || '').trim();
  const n = normalizeText(raw).replace(/^[¡¿]+/, '').replace(/[!.?]+$/, '').trim();
  if (!n) return null;
  if (DELETE_WORDS.includes(n)) return { delete: true };

  const amountOnly = n.match(/^(?:foi|era|e|na verdade|fue|it was|was|actually|valor|value)?\s*(?:de\s+)?((?:r\$|us\$|\$)?\s?[\d.,]+(?:\s?(?:k|mil))?)(?:\s+(?:reais|pesos|dollars|soles))?$/);
  if (amountOnly) {
    const amount = parseAmount(amountOnly[1]);
    if (amount) return { amount };
  }

  const offset = dayOffset(n);
  if (offset && /^(?:foi |era |fue |it was |was )?(?:ontem|anteontem|ayer|anteayer|yesterday|day before yesterday)$/.test(n)) {
    return { dayOffset: offset };
  }

  const pay = n.match(/^(?:foi |era |fue |it was |was |paguei |pague |paid )?(?:no |na |en |on |with |com |con |by |in |em |de )?(?:o |a |el |la |the )?(pix|dinheiro|especie|cash|efectivo|debito|debit|credito|credit|cartao|tarjeta|card|boleto|transferencia)(?:\s+(?:de credito|credito|credit|de debito))?(?:\s+(?:do |da |de |del )?(.+))?$/);
  if (pay) {
    const paymentMethod = detectPaymentMethod(pay[1]);
    const cardName = pay[2] && paymentMethod === 'credit_card' ? restoreWords(pay[2].trim(), raw) : null;
    return { paymentMethod, cardName };
  }

  const cat = n.match(/^(?:e|eh|era|foi|es|fue|its|it's|it is|it was|categoria|category|cat|na categoria|en la categoria|muda pra|mudar para|cambia a|change to)\s+(?:de |da |do |a |o |la |el |the )?(.{2,40})$/);
  if (cat && !findAmounts(cat[1]).length) return { categoryText: cat[1].trim() };

  if (findCategoryKeyByName(n)) return { categoryText: n };
  return null;
}

// ---------------------------------------------------------------------------
// Structured local intents
// ---------------------------------------------------------------------------

const INCOME_START = /^(recebi|ganhei|entrou|caiu|recebimento|received|got paid|earned|i got|recibi|me pagaron|cobre|gane|me cayo|me depositaron|me entro)\b/;
const INCOME_KEYWORD_START = /^(salario|salary|sueldo|paycheck|freela|freelance|pagamento|nomina|quincena)\b/;
const QUERY_START = /^(quanto|cuanto|how much|qual o total|cual es el total|what did i spend|o que gastei|en que gaste)\b/;
const BUDGET_START = /^(limite|limit|orcamento|budget|presupuesto|tope|meta de gasto)\b/;

function parseInstallments(raw, n) {
  const m = n.match(/\b(\d{1,2})\s*x\b/)
    || n.match(/\bem\s+(\d{1,2})\s*(?:vezes|parcelas|x)\b/)
    || n.match(/\ben\s+(\d{1,2})\s*(?:cuotas|meses|pagos|mensualidades|msi)\b/)
    || n.match(/\bin\s+(\d{1,2})\s*(?:installments|payments|months)\b/)
    || n.match(/\b(?:parcelado|parcelada|parcelei)\s+em\s+(\d{1,2})\b/)
    || n.match(/\b(\d{1,2})\s*(?:parcelas|cuotas|installments|msi)\b/);
  if (!m) return null;
  const count = Number(m[1]);
  if (count < 2 || count > 48) return null;
  const withoutCount = n.slice(0, m.index) + ' ' + n.slice(m.index + m[0].length);
  const amounts = findAmounts(withoutCount);
  if (amounts.length !== 1) return null;
  const amount = amounts[0].value;
  let rest = (withoutCount.slice(0, amounts[0].start) + ' ' + withoutCount.slice(amounts[0].end)).replace(/\s+/g, ' ').trim();
  const cardName = detectCardName(rest);
  if (cardName) {
    rest = rest.replace(new RegExp(`\\b(?:no|na|en|on|com|con|with)?\\s*(?:o |a |el |la |the |my |meu |minha |mi )?(?:cartao |tarjeta |card )?(?:de credito |credito |credit )?(?:do |da |de |del )?${cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: card| credit card)?\\s*$`), '');
  }
  rest = rest.replace(/\b(sem juros|sin intereses|interest free|meses sin intereses|parcelado|parcelada|parcelei|vezes|parcelas|cuotas|installments)\b/g, ' ');
  const description = restoreWords(cleanDescription(rest), raw);
  if (!description) return null;
  const guess = guessCategory(description);
  return {
    type: 'installments',
    description,
    amount,
    installments: count,
    cardName: cardName ? restoreWords(cardName, raw) : null,
    category: guess.key,
    confidence: guess.confidence,
    alternatives: guess.alternatives,
  };
}

function parseRecurringBill(raw, n) {
  const m = n.match(/\btod[oa]s?\s+(?:os\s+)?dias?\s+(\d{1,2})\b/)
    || n.match(/\btodo\s+mes\s+(?:no\s+)?dia\s+(\d{1,2})\b/)
    || n.match(/\bdia\s+(\d{1,2})\s+(?:de\s+)?(?:todo|cada)\s+mes\b/)
    || n.match(/\b(?:todos\s+los|cada)\s+(?:dias?|mes\s+el\s+dia)\s+(\d{1,2})\b/)
    || n.match(/\bel\s+(\d{1,2})\s+de\s+cada\s+mes\b/)
    || n.match(/\bevery\s+(?:month\s+on\s+the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/)
    || n.match(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?every\s+month\b/)
    || n.match(/\bvence\s+(?:todo\s+)?dia\s+(\d{1,2})\b/)
    || n.match(/\bvence\s+el\s+(\d{1,2})\b/)
    || n.match(/\bdue\s+(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!m) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  const rest = n.slice(0, m.index) + ' ' + n.slice(m.index + m[0].length);
  const amounts = findAmounts(rest);
  if (amounts.length !== 1) return null;
  const description = cleanDescription(
    (rest.slice(0, amounts[0].start) + ' ' + rest.slice(amounts[0].end)).replace(/\b(conta|cuenta|bill|vence|todo|todos|cada|mes|month|monthly|mensal|mensual)\b/g, ' '),
  );
  if (!description) return null;
  return { type: 'bill', description: restoreWords(description, raw), amount: amounts[0].value, dayOfMonth: day, recurring: true, category: guessCategory(description).key };
}

function parseBudget(raw, n) {
  if (!BUDGET_START.test(n)) return null;
  const amounts = findAmounts(n);
  if (amounts.length !== 1) return null;
  const rest = (n.slice(0, amounts[0].start) + ' ' + n.slice(amounts[0].end))
    .replace(BUDGET_START, ' ')
    .replace(/\b(de|para|pra|com|en|for|on|em|no|na|por|mes|mensal|mensual|monthly|month|el|la|the|gasto|gastos|spending)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!rest) return null;
  const key = findCategoryKeyByName(rest) || guessCategory(rest).key;
  return { type: 'budget', amount: amounts[0].value, categoryText: rest, category: key };
}

const PERIODS = [
  { re: /\b(mes passado|ultimo mes|mes pasado|last month)\b/, period: 'last_month' },
  { re: /\b(hoje|hoy|today)\b/, period: 'today' },
  { re: /\b(ontem|ayer|yesterday)\b/, period: 'yesterday' },
  { re: /\b(semana|week)\b/, period: 'this_week' },
  { re: /\b(ano|this year|este ano|ano todo)\b/, period: 'this_year' },
];

export function detectPeriod(n) {
  for (const { re, period } of PERIODS) if (re.test(n)) return period;
  return 'this_month';
}

function parseQuery(raw, n) {
  if (!QUERY_START.test(n)) return null;
  if (!/\b(gastei|gaste|gastamos|spent|spend|gasto|gastado|paguei|pague|paid)\b/.test(n)) return null;
  const period = detectPeriod(n);
  const term = n
    .replace(QUERY_START, ' ')
    .replace(/\b(eu|yo|i|we|nos|nosotros|gastei|gaste|gastamos|spent|spend|did|have|gasto|gastado|paguei|pague|paid|ja|ya|so far|ate agora|hasta ahora|total|no total|em total)\b/g, ' ')
    .replace(/\b(esse|este|essa|esta|this|neste|nesse|el|la|o|a|the|en|no|na|em|com|con|on|for|at|de|do|da|del|in|with)\b/g, ' ')
    .replace(/\b(mes passado|ultimo mes|mes pasado|last month|mes|month|hoje|hoy|today|ontem|ayer|yesterday|semana|week|ano|year|passado|pasado|last)\b/g, ' ')
    .replace(/[?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { type: 'query', term: term || null, period };
}

function parseIncome(raw, n) {
  if (!INCOME_START.test(n) && !INCOME_KEYWORD_START.test(n)) return null;
  const amounts = findAmounts(n);
  if (amounts.length !== 1) return null;
  const rest = (n.slice(0, amounts[0].start) + ' ' + n.slice(amounts[0].end)).replace(INCOME_START, ' ');
  const description = restoreWords(cleanDescription(rest), raw) || null;
  const guess = guessCategory(description || rest, { income: true });
  return { type: 'income', amount: amounts[0].value, description, category: guess.key, dayOffset: dayOffset(n) };
}

/** Split "uber 23 e mercado 87,50" into items when every part has exactly one amount. */
function splitItems(text) {
  const parts = String(text)
    .split(/\n|;|\s\+\s|\s(?:e|y|and)\s|,\s(?=\D)/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1 && parts.every((p) => findAmounts(p).length === 1)) return parts;
  return [String(text).trim()];
}

function parseExpenseItem(segment) {
  const amounts = findAmounts(segment);
  if (amounts.length !== 1) return null;
  const { value, start, end } = amounts[0];
  const rest = `${segment.slice(0, start)} ${segment.slice(end)}`;
  const paymentMethod = detectPaymentMethod(rest);
  const cardName = paymentMethod === 'credit_card' ? detectCardName(rest) : null;
  let descSource = rest;
  if (cardName) descSource = normalizeText(rest).replace(new RegExp(`\\b${cardName}\\b`), ' ');
  const description = cleanDescription(descSource);
  if (!description) return null;
  if (description.split(' ').length > 5) return null; // too long to be "obvious"
  const guess = guessCategory(description);
  return {
    amount: value,
    description,
    category: guess.key,
    confidence: guess.confidence,
    alternatives: guess.alternatives,
    paymentMethod: paymentMethod || null,
    cardName: cardName ? restoreWords(cardName, segment) : null,
    dayOffset: dayOffset(segment),
  };
}

/**
 * Try to understand a message without the model.
 * Returns an intent object or null (=> ask the model).
 * Expense intents carry `allHighConfidence` so the caller can decide whether
 * a model pass would help.
 */
export function parseLocal(text) {
  const raw = String(text || '').trim();
  if (!raw || raw.length > 400) return null;
  const n = normalizeText(raw);

  const command = parseCommand(raw);
  if (command) return command;

  if (/\?\s*$/.test(raw) && !QUERY_START.test(n)) return null;

  const query = parseQuery(raw, n);
  if (query) return query;

  const budget = parseBudget(raw, n);
  if (budget) return budget;

  const bill = parseRecurringBill(raw, n);
  if (bill) return bill;

  const installments = parseInstallments(raw, n);
  if (installments) return installments;

  const income = parseIncome(raw, n);
  if (income) return income;

  const items = splitItems(raw).map(parseExpenseItem);
  if (items.length && items.every(Boolean)) {
    return { type: 'expense', items, allHighConfidence: items.every((i) => i.confidence === 'high') };
  }
  return null;
}

/** Plausible person name ("Felipe", "Ana Maria"). */
export function looksLikeName(text) {
  const t = String(text || '').trim().replace(/^(me chamo|meu nome e|meu nome é|sou o|sou a|sou|me llamo|soy|my name is|i'm|i am|call me|pode me chamar de|llamame)\s+/i, '');
  if (!t || t.length > 40) return null;
  if (/\d/.test(t)) return null;
  const words = t.split(/\s+/);
  if (words.length > 4) return null;
  if (!words.every((w) => /^[\p{L}'.-]+$/u.test(w))) return null;
  if (parseCommand(t)) return null;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
