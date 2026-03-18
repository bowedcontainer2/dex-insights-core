import { supabase } from './supabase.js';
import type { PatternEvent, DailyStats } from '../shared/types.js';

export async function storePatternEvents(userId: string, events: PatternEvent[]): Promise<void> {
  if (events.length === 0) return;

  const rows = events.map((e) => ({
    user_id: userId,
    pattern_type: e.patternType,
    detected_date: e.detectedDate,
    start_time: e.startTime,
    end_time: e.endTime ?? null,
    magnitude: e.magnitude,
    metadata: e.metadata ?? null,
  }));

  const { error } = await supabase
    .from('pattern_events')
    .upsert(rows, {
      onConflict: 'user_id,pattern_type,detected_date,start_time',
      ignoreDuplicates: true,
    });

  if (error) throw error;
}

export async function getPatternEventsByRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PatternEvent[]> {
  const { data, error } = await supabase
    .from('pattern_events')
    .select('pattern_type, detected_date, start_time, end_time, magnitude, metadata')
    .eq('user_id', userId)
    .gte('detected_date', startDate)
    .lte('detected_date', endDate)
    .order('detected_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    patternType: r.pattern_type,
    detectedDate: r.detected_date,
    startTime: r.start_time,
    endTime: r.end_time,
    magnitude: r.magnitude,
    metadata: r.metadata ?? undefined,
  })) as PatternEvent[];
}

export async function upsertDailyStats(
  userId: string,
  date: string,
  stats: Omit<DailyStats, 'date'>
): Promise<void> {
  const { error } = await supabase
    .from('daily_stats')
    .upsert({
      user_id: userId,
      date,
      reading_count: stats.readingCount,
      mean_glucose: stats.meanGlucose,
      std_dev: stats.stdDev,
      min_glucose: stats.minGlucose,
      max_glucose: stats.maxGlucose,
      time_in_range_pct: stats.timeInRangePct,
      time_below_pct: stats.timeBelowPct,
      time_above_pct: stats.timeAbovePct,
      cv: stats.cv,
      gmi: stats.gmi,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' });

  if (error) throw error;
}

export async function getDailyStatsByRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, reading_count, mean_glucose, std_dev, min_glucose, max_glucose, time_in_range_pct, time_below_pct, time_above_pct, cv, gmi')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    date: r.date,
    readingCount: r.reading_count,
    meanGlucose: r.mean_glucose,
    stdDev: r.std_dev,
    minGlucose: r.min_glucose,
    maxGlucose: r.max_glucose,
    timeInRangePct: r.time_in_range_pct,
    timeBelowPct: r.time_below_pct,
    timeAbovePct: r.time_above_pct,
    cv: r.cv,
    gmi: r.gmi ?? Math.round((3.31 + 0.02392 * r.mean_glucose) * 10) / 10,
  }));
}
