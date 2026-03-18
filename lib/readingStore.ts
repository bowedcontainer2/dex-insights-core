import { supabase } from './supabase.js';
import type { DexcomEGV } from '../shared/types.js';

interface ReadingRow {
  value: number;
  trend: string;
  trend_rate: number | null;
  system_time: string;
}

export async function storeReadings(userId: string, egvs: DexcomEGV[]): Promise<number> {
  if (egvs.length === 0) return 0;

  const rows = egvs.map((egv) => ({
    user_id: userId,
    value: egv.value,
    trend: egv.trend,
    trend_rate: egv.trendRate,
    system_time: egv.systemTime,
  }));

  // Insert with ON CONFLICT DO NOTHING (upsert with ignoreDuplicates)
  const { data, error } = await supabase
    .from('readings')
    .upsert(rows, { onConflict: 'user_id,system_time', ignoreDuplicates: true })
    .select('id');

  if (error) throw error;

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`Stored ${count} new readings`);
  }
  return count;
}

export async function getReadingsForDate(userId: string, dateStr: string): Promise<ReadingRow[]> {
  const nextDay = new Date(dateStr);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('readings')
    .select('value, trend, trend_rate, system_time')
    .eq('user_id', userId)
    .gte('system_time', dateStr)
    .lt('system_time', nextDayStr)
    .order('system_time');

  if (error) throw error;
  return data as ReadingRow[];
}

export async function getReadingsByRange(userId: string, start: string, end: string): Promise<ReadingRow[]> {
  const { data, error } = await supabase
    .from('readings')
    .select('value, trend, trend_rate, system_time')
    .eq('user_id', userId)
    .gte('system_time', start)
    .lte('system_time', end)
    .order('system_time');

  if (error) throw error;
  return data as ReadingRow[];
}
