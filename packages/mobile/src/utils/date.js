const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (value) => String(value).padStart(2, '0');

export const parseDateParts = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const isoMatch = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: isoMatch[3] ? Number(isoMatch[3]) : 1,
      };
    }
    if (value.includes('T')) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return parseDateParts(date);
      }
    }
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  if (typeof value === 'number') {
    return parseDateParts(new Date(value));
  }

  return null;
};

export const formatBrazilDate = (value, { withYear = true } = {}) => {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const { day, month, year } = parts;
  return withYear ? `${pad(day)}/${pad(month)}/${year}` : `${pad(day)}/${pad(month)}`;
};

export const formatBrazilDateLong = (value, { includeYear = true } = {}) => {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const { day, month, year } = parts;
  const monthLabel = MONTHS_LONG[month - 1] || '';
  return includeYear ? `${pad(day)} de ${monthLabel} de ${year}` : `${pad(day)} de ${monthLabel}`;
};

export const formatBrazilMonthYear = (value, { short = false, includeYear = true } = {}) => {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const { month, year } = parts;
  const monthLabel = short ? MONTHS_SHORT[month - 1] || '' : MONTHS_LONG[month - 1] || '';
  return includeYear ? `${monthLabel} de ${year}` : monthLabel;
};

export const formatBrazilMonthShort = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const { month, year } = parts;
  const monthLabel = MONTHS_SHORT[month - 1] || '';
  return `${monthLabel}/${String(year).slice(-2)}`;
};

export const formatBrazilTimelineLabel = (value) => formatBrazilMonthShort(value);

export const formatBrazilDayMonthShort = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const { day, month } = parts;
  const monthLabel = MONTHS_SHORT[month - 1] || '';
  return `${pad(day)} ${monthLabel}`;
};

export const formatBrazilDayMonthNumeric = (value) => formatBrazilDate(value, { withYear: false });


