import { useState, useEffect, useCallback } from 'react';
import type { GlucoseReading } from '../types/dexcom';
import { getCurrentReading } from '../services/api';
import { classifyRange, isStale } from '../utils/glucose';

export function useCurrentReading(intervalMs = 60 * 1000) {
  const [reading, setReading] = useState<GlucoseReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getCurrentReading();
      if (data.reading) {
        setReading({
          value: data.reading.value,
          trend: data.reading.trend,
          trendRate: data.reading.trendRate,
          timestamp: data.reading.systemTime,
          range: classifyRange(data.reading.value),
        });
        setStale(isStale(data.reading.systemTime));
      } else {
        setReading(null);
      }
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

  return { reading, loading, error, stale };
}
