import { useState, useEffect, useCallback } from 'react';
import type { DexcomEGV } from '../types/dexcom';
import { getEGVs } from '../services/api';

export function useGlucoseData(hours = 24, intervalMs = 5 * 60 * 1000) {
  const [egvs, setEgvs] = useState<DexcomEGV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getEGVs(hours);
      setEgvs(data.egvs);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs]);

  return { egvs, loading, error };
}
