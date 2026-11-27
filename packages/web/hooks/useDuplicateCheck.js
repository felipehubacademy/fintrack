import { useState, useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';

export function useDuplicateCheck() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkDuplicates = useCallback(async (email, phone) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/check-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('web.useDuplicateCheck.couldnTCheckForDuplicates'));
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkDuplicates,
    loading,
    error
  };
}
