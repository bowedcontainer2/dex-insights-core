import { useState, useCallback, useEffect, useRef } from 'react';
import { askQuestion } from '../services/api';
import type { QuickAskKey } from '../types/dexcom';

const COOLDOWN_SECONDS = 30;

export function useQuickAsk() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuickAskKey | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldownRemaining(COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const ask = useCallback(async (key: QuickAskKey) => {
    setLoading(true);
    setError(null);
    setActiveQuestion(key);
    setAnswer(null);

    try {
      const result = await askQuestion(key);
      setAnswer(result.answer);
      startCooldown();
    } catch (err: any) {
      if (err.message?.includes('429')) {
        setError('Daily question limit reached. Try again tomorrow.');
      } else {
        setError('Something went wrong. Try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  }, [startCooldown]);

  const dismiss = useCallback(() => {
    setAnswer(null);
    setError(null);
    setActiveQuestion(null);
  }, []);

  return { answer, loading, error, activeQuestion, cooldownRemaining, ask, dismiss };
}
