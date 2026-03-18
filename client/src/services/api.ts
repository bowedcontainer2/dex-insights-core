import type { DexcomEGV, DexcomEGVResponse, PatternsResponse, InsightsResponse } from '../types/dexcom';
import { getMockEGVs, getMockCurrentReading } from '../mocks/egvData';
import { supabase } from '../lib/supabase';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getEGVs(hours = 24): Promise<DexcomEGVResponse> {
  if (USE_MOCK) {
    return {
      unit: 'mg/dL',
      rateUnit: 'mg/dL/min',
      egvs: getMockEGVs(),
    };
  }
  return fetchJSON<DexcomEGVResponse>(`/api/glucose/egvs?hours=${hours}`);
}

export async function getCurrentReading(): Promise<{ reading: DexcomEGV | null }> {
  if (USE_MOCK) {
    return { reading: getMockCurrentReading() };
  }
  return fetchJSON<{ reading: DexcomEGV | null }>('/api/glucose/current');
}

export async function getPatterns(days = 7): Promise<PatternsResponse> {
  if (USE_MOCK) {
    return { patterns: [], todayStats: null, windowStats: [] };
  }
  return fetchJSON<PatternsResponse>(`/api/patterns?days=${days}`);
}

export async function getInsights(): Promise<InsightsResponse> {
  if (USE_MOCK) {
    return { alert: '', recommendation: '', daySummary: '', source: 'fallback', generatedDate: '' };
  }
  return fetchJSON<InsightsResponse>('/api/insights');
}

export async function connectDexcom(username: string, password: string): Promise<void> {
  await fetchJSON('/api/dexcom/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export async function getDexcomStatus(): Promise<{ connected: boolean }> {
  return fetchJSON<{ connected: boolean }>('/api/dexcom/status');
}

export async function disconnectDexcom(): Promise<void> {
  await fetchJSON('/api/dexcom/disconnect', { method: 'POST' });
}
