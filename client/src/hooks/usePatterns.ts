import { useState, useEffect, useCallback } from 'react';
import type { PatternsResponse } from '../types/dexcom';
import { getPatterns } from '../services/api';

export function usePatterns(intervalMs = 5 * 60 * 1000) {
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await getPatterns();
      setData(response);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs]);

  return { data, loading, error };
}
