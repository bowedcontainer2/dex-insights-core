import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getDexcomStatus } from '../services/api';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dexcomConnected, setDexcomConnected] = useState(false);
  const [dexcomLoading, setDexcomLoading] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Dexcom status when authenticated
  useEffect(() => {
    if (!session) {
      setDexcomConnected(false);
      return;
    }

    setDexcomLoading(true);
    getDexcomStatus()
      .then(({ connected }) => setDexcomConnected(connected))
      .catch(() => setDexcomConnected(false))
      .finally(() => setDexcomLoading(false));
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setDexcomConnected(false);
  }, []);

  const refreshDexcomStatus = useCallback(async () => {
    if (!session) return;
    setDexcomLoading(true);
    try {
      const { connected } = await getDexcomStatus();
      setDexcomConnected(connected);
    } catch {
      setDexcomConnected(false);
    } finally {
      setDexcomLoading(false);
    }
  }, [session]);

  return {
    user,
    session,
    loading,
    authenticated: !!session,
    signIn,
    signUp,
    signOut,
    dexcomConnected,
    dexcomLoading,
    refreshDexcomStatus,
  };
}
