import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getDexcomStatus } from '../services/api';
import type { Session, User } from '@supabase/supabase-js';
import React from 'react';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  dexcomConnected: boolean;
  dexcomLoading: boolean;
  refreshDexcomStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const value: AuthState = {
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

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
