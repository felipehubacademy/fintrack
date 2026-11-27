import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { committedByMonth, committedWindowEnd, tomorrowString } from './cardStatements';

/**
 * Loads installments already scheduled on the given credit cards for the
 * next `months` statements (one query on `expenses`).
 *
 * @param {Array} cards [{ id, closing_day }]
 * @returns {{ data: { months, total, max }, loading: boolean, reload: Function }}
 */
export function useCommittedInstallments(cards, { organizationId, months = 6 } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const cardIds = useMemo(
    () => (cards || []).filter((c) => c && c.id).map((c) => c.id),
    [cards]
  );
  const idsKey = cardIds.join(',');

  const closingDayByCard = useMemo(() => {
    const map = {};
    (cards || []).forEach((c) => {
      if (c && c.id) map[c.id] = c.closing_day ?? null;
    });
    return map;
  }, [cards]);

  const reload = useCallback(async () => {
    if (!cardIds.length) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const today = new Date();
      let query = supabase
        .from('expenses')
        .select('id, amount, date, card_id, installment_info')
        .in('card_id', cardIds)
        .eq('payment_method', 'credit_card')
        .eq('status', 'confirmed')
        .gte('date', tomorrowString(today))
        .lte('date', committedWindowEnd(today, months))
        .not('installment_info', 'is', null);
      if (organizationId) query = query.eq('organization_id', organizationId);
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (_) {
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, organizationId, months]);

  useEffect(() => {
    reload();
  }, [reload]);

  const data = useMemo(
    () => committedByMonth(rows, { closingDayByCard, months }),
    [rows, closingDayByCard, months]
  );

  return { data, loading, reload };
}
