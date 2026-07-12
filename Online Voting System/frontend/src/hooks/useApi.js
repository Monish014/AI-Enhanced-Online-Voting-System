import { useState, useCallback } from 'react';

/**
 * Generic data-fetching hook with loading/error state.
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi(electionService.getAll);
 *   useEffect(() => { execute({ status: 'active' }); }, []);
 */
export default function useApi(apiFn, initialData = null) {
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      setData(result);
      return { success: true, data: result };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'An error occurred.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return { data, loading, error, execute, setData, reset };
}
