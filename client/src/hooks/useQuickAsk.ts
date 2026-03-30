import { useState, useCallback, useEffect, useRef } from 'react';
import { askQuestion, askCustomQuestion } from '../services/api';
import type { QuickAskKey } from '../types/dexcom';

const COOLDOWN_SECONDS = 30;

export function useQuickAsk() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuickAskKey | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string | null>(null);
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

  const handleError = useCallback((err: any) => {
    if (err.message?.includes('429')) {
      setError('Daily question limit reached. Try again tomorrow.');
    } else {
      setError('Something went wrong. Try again in a moment.');
    }
  }, []);

  const ask = useCallback(async (key: QuickAskKey) => {
    setLoading(true);
    setError(null);
    setActiveQuestion(key);
    setCustomQuestion(null);
    setAnswer(null);

    try {
      const result = await askQuestion(key);
      setAnswer(result.answer);
      startCooldown();
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [startCooldown, handleError]);

  const askCustom = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    setActiveQuestion(null);
    setCustomQuestion(text);
    setAnswer(null);

    try {
      const result = await askCustomQuestion(text);
      setAnswer(result.answer);
      startCooldown();
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [startCooldown, handleError]);

  const dismiss = useCallback(() => {
    setAnswer(null);
    setError(null);
    setActiveQuestion(null);
    setCustomQuestion(null);
  }, []);

  const displayQuestion = activeQuestion ?? customQuestion;

  return { answer, loading, error, activeQuestion, customQuestion, displayQuestion, cooldownRemaining, ask, askCustom, dismiss };
}
