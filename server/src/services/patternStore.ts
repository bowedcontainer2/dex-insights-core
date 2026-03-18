import { getDb } from './database.js';
import type { PatternEvent, DailyStats } from '../../../shared/types.js';

export function storePatternEvents(events: PatternEvent[]): void {
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO pattern_events (pattern_type, detected_date, start_time, end_time, magnitude, metadata)
    VALUES (@patternType, @detectedDate, @startTime, @endTime, @magnitude, @metadata)
  `);

  const tx = db.transaction((items: PatternEvent[]) => {
    for (const e of items) {
      insert.run({
        patternType: e.patternType,
        detectedDate: e.detectedDate,
        startTime: e.startTime,
        endTime: e.endTime ?? null,
        magnitude: e.magnitude,
        metadata: e.metadata ? JSON.stringify(e.metadata) : null,
      });
    }
  });

  tx(events);
}

export function getPatternEventsByRange(startDate: string, endDate: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT pattern_type, detected_date, start_time, end_time, magnitude, metadata
    FROM pattern_events
    WHERE detected_date >= ? AND detected_date <= ?
    ORDER BY detected_date DESC, start_time DESC
  `).all(startDate, endDate) as any[];

  return rows.map((r) => ({
    patternType: r.pattern_type,
    detectedDate: r.detected_date,
    startTime: r.start_time,
    endTime: r.end_time,
    magnitude: r.magnitude,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
  })) as PatternEvent[];
}

export function upsertDailyStats(date: string, stats: Omit<DailyStats, 'date'>): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO daily_stats (date, reading_count, mean_glucose, std_dev, min_glucose, max_glucose, time_in_range_pct, time_below_pct, time_above_pct, cv, gmi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    date,
    stats.readingCount,
    stats.meanGlucose,
    stats.stdDev,
    stats.minGlucose,
    stats.maxGlucose,
    stats.timeInRangePct,
    stats.timeBelowPct,
    stats.timeAbovePct,
    stats.cv,
    stats.gmi,
  );
}

export function getDailyStatsByRange(startDate: string, endDate: string): DailyStats[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT date, reading_count, mean_glucose, std_dev, min_glucose, max_glucose, time_in_range_pct, time_below_pct, time_above_pct, cv, gmi
    FROM daily_stats
    WHERE date >= ? AND date <= ?
    ORDER BY date DESC
  `).all(startDate, endDate) as any[];

  return rows.map((r) => ({
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
