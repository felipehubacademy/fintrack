const MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const getCurrentMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const normalizeMonthKey = (value) => {
  if (value && MONTH_KEY_REGEX.test(value)) {
    return value;
  }
  return getCurrentMonthKey();
};

const toDateString = (date) => date.toISOString().split('T')[0];

export const getMonthRange = (value) => {
  const monthKey = normalizeMonthKey(value);
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;

  const startDateObj = new Date(Date.UTC(year, monthIndex, 1));
  const endDateObj = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    monthKey,
    startDate: toDateString(startDateObj),
    endDate: toDateString(endDateObj),
    startDateObj,
    endDateObj,
  };
};

