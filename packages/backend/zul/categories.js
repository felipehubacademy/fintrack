/**
 * Canonical categories Zul knows. Each one maps to a row in budget_categories
 * by name (in any language), so it works with the existing global Portuguese
 * categories and with per-organization categories in English or Spanish.
 *
 * names[lang][0] is the name Zul shows and creates; the rest are aliases used
 * to find an existing row.
 */
import { normalizeText } from './language.js';

export const EXPENSE_CATEGORIES = [
  {
    key: 'groceries',
    macro: 'needs',
    names: { pt: ['Mercado', 'Supermercado', 'Alimentação'], es: ['Supermercado', 'Mercado', 'Alimentación'], en: ['Groceries', 'Food'] },
    keywords: ['mercado', 'supermercado', 'super', 'supermarket run', 'feira', 'hortifruti', 'sacolao', 'atacadao', 'assai', 'carrefour', 'pao de acucar',
      'groceries', 'grocery', 'supermarket', 'walmart', 'costco', 'whole foods', 'trader joes', 'aldi', 'kroger', 'safeway', 'publix',
      'soriana', 'chedraui', 'bodega aurrera', 'exito', 'jumbo', 'lider', 'tottus', 'plaza vea', 'wong', 'mercadona', 'verduras', 'frutas', 'acougue', 'carniceria'],
  },
  {
    key: 'restaurants',
    macro: 'wants',
    names: { pt: ['Restaurante', 'Restaurantes', 'Alimentação'], es: ['Restaurantes', 'Restaurante', 'Comida'], en: ['Restaurants', 'Dining', 'Eating out'] },
    keywords: ['restaurante', 'restaurant', 'lanche', 'lanchonete', 'almoco', 'jantar', 'janta', 'cafe da manha', 'ifood', 'rappi', 'uber eats', 'didi food',
      'doordash', 'grubhub', 'pizza', 'hamburguer', 'burger', 'sushi', 'cafe', 'cafeteria', 'coffee', 'starbucks', 'padaria', 'bakery', 'panaderia',
      'bar', 'boteco', 'cerveja', 'beer', 'cerveza', 'chopp', 'delivery', 'lunch', 'dinner', 'breakfast', 'brunch', 'almuerzo', 'cena', 'desayuno',
      'tacos', 'taqueria', 'mcdonalds', 'subway', 'kfc', 'acai', 'sorvete', 'ice cream', 'helado', 'pastel', 'salgado', 'marmita'],
  },
  {
    key: 'transport',
    macro: 'needs',
    names: { pt: ['Transporte'], es: ['Transporte'], en: ['Transportation', 'Transport'] },
    keywords: ['uber', '99', '99pop', 'taxi', 'cabify', 'didi', 'lyft', 'onibus', 'metro', 'subway ride', 'bus', 'trem', 'train', 'tren',
      'gasolina', 'combustivel', 'etanol', 'alcool', 'diesel', 'posto', 'gas station', 'fuel', 'gas', 'nafta', 'bencina', 'estacionamento',
      'parking', 'estacionamiento', 'pedagio', 'toll', 'peaje', 'sem parar', 'bilhete unico', 'passagem de onibus', 'colectivo', 'subte'],
  },
  {
    key: 'utilities',
    macro: 'needs',
    names: { pt: ['Contas', 'Contas de casa'], es: ['Servicios', 'Cuentas'], en: ['Utilities', 'Bills'] },
    keywords: ['luz', 'energia', 'conta de luz', 'agua', 'conta de agua', 'internet', 'wifi', 'telefone', 'celular', 'plano de celular', 'gas de cozinha',
      'electricity', 'water bill', 'phone bill', 'cell phone', 'electricidad', 'telefono', 'recarga', 'vivo', 'tim', 'oi fibra', 'net', 'telcel', 'movistar'],
  },
  {
    key: 'home',
    macro: 'needs',
    names: { pt: ['Casa', 'Moradia'], es: ['Hogar', 'Vivienda', 'Casa'], en: ['Home', 'Housing'] },
    keywords: ['aluguel', 'condominio', 'iptu', 'rent', 'alquiler', 'arriendo', 'renta', 'moveis', 'furniture', 'muebles', 'reforma', 'faxina',
      'diarista', 'limpeza', 'cleaning', 'limpieza', 'leroy', 'home depot', 'ikea', 'utensilios', 'mortgage', 'hipoteca', 'financiamento'],
  },
  {
    key: 'health',
    macro: 'needs',
    names: { pt: ['Saúde'], es: ['Salud'], en: ['Health'] },
    keywords: ['farmacia', 'drogaria', 'remedio', 'medico', 'consulta', 'dentista', 'hospital', 'exame', 'laboratorio', 'plano de saude', 'terapia',
      'psicologo', 'pharmacy', 'drugstore', 'cvs', 'walgreens', 'doctor', 'medicine', 'dentist', 'medicamento', 'medicina', 'academia', 'gym',
      'gimnasio', 'smart fit', 'pilates', 'suplemento', 'whey', 'otica', 'oculos'],
  },
  {
    key: 'education',
    macro: 'wants',
    names: { pt: ['Educação'], es: ['Educación'], en: ['Education'] },
    keywords: ['escola', 'colegio', 'faculdade', 'universidade', 'curso', 'livro', 'livraria', 'mensalidade escolar', 'material escolar', 'school',
      'tuition', 'course', 'book', 'books', 'udemy', 'universidad', 'libro', 'libros', 'idiomas', 'ingles', 'aula'],
  },
  {
    key: 'leisure',
    macro: 'wants',
    names: { pt: ['Lazer'], es: ['Ocio', 'Entretenimiento'], en: ['Entertainment', 'Leisure'] },
    keywords: ['cinema', 'cine', 'movie', 'movies', 'show', 'ingresso', 'ticket', 'tickets', 'teatro', 'theater', 'parque', 'park',
      'jogo', 'game', 'games', 'videogame', 'steam', 'playstation', 'xbox', 'festa', 'party', 'fiesta', 'balada', 'boliche', 'karaoke', 'museu', 'museum', 'concert', 'concierto'],
  },
  {
    key: 'subscriptions',
    macro: 'wants',
    names: { pt: ['Assinaturas', 'Streaming'], es: ['Suscripciones'], en: ['Subscriptions'] },
    keywords: ['netflix', 'spotify', 'prime video', 'amazon prime', 'disney', 'hbo', 'hbo max', 'globoplay', 'youtube premium', 'deezer', 'icloud',
      'google one', 'chatgpt', 'apple music', 'assinatura', 'subscription', 'suscripcion', 'paramount', 'crunchyroll'],
  },
  {
    key: 'shopping',
    macro: 'wants',
    names: { pt: ['Compras', 'Vestuário', 'Roupas'], es: ['Compras', 'Ropa'], en: ['Shopping', 'Clothing'] },
    keywords: ['roupa', 'roupas', 'sapato', 'tenis', 'camisa', 'calca', 'vestido', 'shopping', 'shein', 'shopee', 'amazon', 'mercado livre',
      'mercado libre', 'aliexpress', 'renner', 'riachuelo', 'cea', 'zara', 'clothes', 'shoes', 'shirt', 'ropa', 'zapatos', 'camiseta',
      'presente', 'gift', 'regalo', 'eletronico', 'eletronicos', 'tv', 'tele', 'televisao', 'televisor', 'notebook', 'laptop', 'iphone', 'geladeira', 'celular novo', 'fone', 'headphones', 'target', 'best buy', 'liverpool', 'falabella'],
  },
  {
    key: 'beauty',
    macro: 'wants',
    names: { pt: ['Beleza', 'Cuidados pessoais'], es: ['Belleza', 'Cuidado personal'], en: ['Personal care', 'Beauty'] },
    keywords: ['cabelo', 'cabeleireiro', 'salao', 'manicure', 'unha', 'barbeiro', 'barbearia', 'maquiagem', 'perfume', 'cosmetico', 'haircut',
      'barber', 'salon', 'nails', 'makeup', 'peluqueria', 'barberia', 'unas', 'maquillaje', 'sephora', 'boticario', 'natura'],
  },
  {
    key: 'pets',
    macro: 'needs',
    names: { pt: ['Pets'], es: ['Mascotas'], en: ['Pets'] },
    keywords: ['pet', 'petshop', 'pet shop', 'racao', 'veterinario', 'vet', 'banho e tosa', 'cachorro', 'gato', 'dog', 'cat', 'perro',
      'mascota', 'croquetas', 'petz', 'cobasi', 'petco', 'petsmart'],
  },
  {
    key: 'travel',
    macro: 'wants',
    names: { pt: ['Viagem', 'Viagens'], es: ['Viajes'], en: ['Travel'] },
    keywords: ['viagem', 'hotel', 'pousada', 'hostel', 'airbnb', 'passagem aerea', 'voo', 'aviao', 'flight', 'airline', 'vuelo', 'viaje',
      'latam', 'gol', 'azul linhas', 'booking', 'decolar', 'aeromexico', 'avianca', 'hospedagem'],
  },
  {
    key: 'other',
    macro: 'wants',
    names: { pt: ['Outros', 'Outras'], es: ['Otros'], en: ['Other', 'Others'] },
    keywords: [],
  },
];

export const INCOME_CATEGORIES = [
  { key: 'salary', names: { pt: ['Salário'], es: ['Salario', 'Sueldo'], en: ['Salary', 'Paycheck'] },
    keywords: ['salario', 'salary', 'paycheck', 'sueldo', 'pagamento do trabalho', 'holerite', 'nomina', 'quincena'] },
  { key: 'freelance', names: { pt: ['Freelance'], es: ['Freelance', 'Honorarios'], en: ['Freelance'] },
    keywords: ['freela', 'freelance', 'job', 'bico', 'trabajo extra', 'honorarios', 'cliente', 'client', 'consultoria'] },
  { key: 'sales', names: { pt: ['Vendas', 'Venda'], es: ['Ventas'], en: ['Sales'] },
    keywords: ['venda', 'vendi', 'vendas', 'sale', 'sold', 'venta', 'vendi'] },
  { key: 'refund', names: { pt: ['Reembolso'], es: ['Reembolso'], en: ['Refund'] },
    keywords: ['reembolso', 'refund', 'estorno', 'cashback', 'devolucion'] },
  { key: 'other_income', names: { pt: ['Outras receitas', 'Outros'], es: ['Otros ingresos', 'Otros'], en: ['Other income', 'Other'] },
    keywords: [] },
];

const BY_KEY = new Map([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.key, c]));

export function categoryByKey(key) {
  return BY_KEY.get(key) || null;
}

export const EXPENSE_KEYS = EXPENSE_CATEGORIES.map((c) => c.key);
export const INCOME_KEYS = INCOME_CATEGORIES.map((c) => c.key);

/** Display name of a canonical category in a language. */
export function categoryLabel(key, lang) {
  const c = BY_KEY.get(key);
  return c ? c.names[lang]?.[0] || c.names.en[0] : key;
}

function keywordRegex(keyword) {
  const escaped = normalizeText(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`);
}
const REGEX_CACHE = new Map();
function matches(text, keyword) {
  if (!REGEX_CACHE.has(keyword)) REGEX_CACHE.set(keyword, keywordRegex(keyword));
  return REGEX_CACHE.get(keyword).test(text);
}

/**
 * Guess a category from free text.
 * Returns { key, confidence: 'high'|'low', alternatives: [key...] }.
 */
export function guessCategory(description, { income = false } = {}) {
  const text = normalizeText(description);
  const list = income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  // Longest keyword wins, so "uber eats" beats "uber".
  let best = null;
  for (const cat of list) {
    for (const kw of cat.keywords) {
      if (matches(text, kw) && (!best || kw.length > best.kw.length)) best = { key: cat.key, kw };
    }
  }
  if (best) return { key: best.key, confidence: 'high', alternatives: [] };
  // Also accept the category's own name ("lazer 50", "health 20").
  const byName = findCategoryKeyByName(description, { income });
  if (byName) return { key: byName, confidence: 'high', alternatives: [] };
  return income
    ? { key: 'other_income', confidence: 'low', alternatives: ['salary', 'freelance', 'sales'] }
    : { key: 'other', confidence: 'low', alternatives: ['restaurants', 'groceries', 'shopping'] };
}

/** "lazer" / "ocio" / "health" -> canonical key, or null. */
export function findCategoryKeyByName(text, { income = false } = {}) {
  const n = normalizeText(text);
  if (!n) return null;
  const list = income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  for (const cat of list) {
    for (const names of Object.values(cat.names)) {
      if (names.some((name) => normalizeText(name) === n)) return cat.key;
    }
  }
  return null;
}
