/**
 * Normaliza nomes para comparação consistente
 * Remove acentos, converte para minúsculas e trata variações comuns
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim();
}

/**
 * Mapeia nomes normalizados para nomes canônicos
 */
const NAME_MAPPING = {
  'felipe': 'Felipe',
  'leticia': 'Letícia',
  'letícia': 'Letícia',
  'compartilhado': 'Compartilhado',
  'compartilhada': 'Compartilhado',
  'compartilhar': 'Compartilhado'
};

/**
 * Converte um nome para sua forma canônica
 */
export function getCanonicalName(name) {
  const normalized = normalizeName(name);
  return NAME_MAPPING[normalized] || name;
}

/**
 * Verifica se dois nomes são equivalentes
 */
export function isSameName(name1, name2) {
  return normalizeName(name1) === normalizeName(name2);
}

/**
 * Filtra array de objetos por nome normalizado
 */
export function filterByName(items, nameField, targetName) {
  const normalizedTarget = normalizeName(targetName);
  return items.filter(item => 
    normalizeName(item[nameField]) === normalizedTarget
  );
}

/**
 * Encontra item em array por nome normalizado
 */
export function findByName(items, nameField, targetName) {
  const normalizedTarget = normalizeName(targetName);
  return items.find(item => 
    normalizeName(item[nameField]) === normalizedTarget
  );
}

