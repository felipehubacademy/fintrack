/**
 * Utility helpers to keep transaction ordering consistent across screens.
 * Past/current transactions (<= today) come first in descending order,
 * followed by future transactions in ascending order. Ties fall back to
 * creation timestamps to preserve chronological sequencing.
 */

const parseDateValue = (value) => {
  if (!value) return 0;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  const normalized =
    typeof value === 'string' && value.includes('T')
      ? value
      : `${value}T00:00:00`;

  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const parseCreatedAt = (value) => {
  if (!value) return 0;
  if (value instanceof Date) {
    return value.getTime();
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const orderItemsByTimeline = (
  items = [],
  {
    getDate = (item) => item?.date,
    getCreatedAt = (item) =>
      item?.created_at ||
      item?.confirmed_at ||
      item?.inserted_at ||
      item?.updated_at,
  } = {}
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  return [...items].sort((a, b) => {
    const dateATime = parseDateValue(getDate(a));
    const dateBTime = parseDateValue(getDate(b));
    const createdATime = parseCreatedAt(getCreatedAt(a));
    const createdBTime = parseCreatedAt(getCreatedAt(b));

    const aIsFuture = dateATime > todayTime;
    const bIsFuture = dateBTime > todayTime;

    if (aIsFuture && !bIsFuture) return 1;
    if (!aIsFuture && bIsFuture) return -1;

    if (!aIsFuture && !bIsFuture) {
      if (dateATime !== dateBTime) {
        return dateBTime - dateATime;
      }
      return createdBTime - createdATime;
    }

    if (aIsFuture && bIsFuture) {
      if (dateATime !== dateBTime) {
        return dateATime - dateBTime;
      }
      return createdATime - createdBTime;
    }

    return 0;
  });
};

export const orderTransactionsForDisplay = (transactions = []) =>
  orderItemsByTimeline(transactions);


