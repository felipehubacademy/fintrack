// Deterministic color mapping utilities and standard palettes

const BASE_COLORS = [
  '#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#84CC16', '#F97316', '#EC4899', '#14B8A6', '#F43F5E',
  '#0EA5E9', '#A855F7', '#22C55E', '#D946EF', '#EAB308', '#DC2626'
];

export const normalizeKey = (name) => {
  return (name || 'Outros')
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const colorHash = (key) => {
  const s = normalizeKey(key);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return BASE_COLORS[hash % BASE_COLORS.length];
};

export const buildOwnerColorMap = (costCenters = []) => {
  const map = {};
  costCenters.forEach((c) => {
    if (!c || !c.name) return;
    const key = normalizeKey(c.name);
    map[key] = c.color || colorHash(c.name);
  });
  return map;
};

export const buildCategoryColorMap = (categories = []) => {
  const map = {};
  categories.forEach((c) => {
    if (!c || !c.name) return;
    const key = normalizeKey(c.name);
    map[key] = c.color || colorHash(c.name);
  });
  return map;
};

export const paymentMethodColor = (method) => {
  switch (method) {
    case 'credit_card':
      return '#6366F1';
    case 'debit_card':
      return '#06B6D4';
    case 'pix':
      return '#10B981';
    case 'cash':
      return '#F59E0B';
    case 'bank_transfer':
      return '#3B82F6';
    case 'boleto':
      return '#EC4899';
    default:
      return '#8B5CF6';
  }
};

export const resolveColor = (name, map) => {
  const key = normalizeKey(name);
  return (map && map[key]) || colorHash(name);
};

// Choose readable text color (black/white) based on background hex
export const textColorForBg = (hex) => {
  if (!hex || typeof hex !== 'string') return '#111827';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#FFFFFF';
};


