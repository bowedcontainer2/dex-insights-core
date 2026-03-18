import { getDb } from './database.js';
import type { DexcomEGV } from '../../../shared/types.js';

interface ReadingRow {
  value: number;
  trend: string;
  trend_rate: number | null;
  system_time: string;
}

export function storeReadings(egvs: DexcomEGV[]): number {
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO readings (value, trend, trend_rate, system_time)
    VALUES (@value, @trend, @trendRate, @systemTime)
  `);

  const tx = db.transaction((items: DexcomEGV[]) => {
    let inserted = 0;
    for (const egv of items) {
      const result = insert.run({
        value: egv.value,
        trend: egv.trend,
        trendRate: egv.trendRate,
        systemTime: egv.systemTime,
      });
      inserted += result.changes;
    }
    return inserted;
  });

  const count = tx(egvs);
  if (count > 0) {
    console.log(`Stored ${count} new readings`);
  }
  return count;
}

export function getReadingsForDate(dateStr: string): ReadingRow[] {
  const db = getDb();
  return db.prepare(`
    SELECT value, trend, trend_rate, system_time
    FROM readings
    WHERE system_time >= ? AND system_time < date(?, '+1 day')
    ORDER BY system_time
  `).all(dateStr, dateStr) as ReadingRow[];
}

export function getReadingsByRange(start: string, end: string): ReadingRow[] {
  const db = getDb();
  return db.prepare(`
    SELECT value, trend, trend_rate, system_time
    FROM readings
    WHERE system_time >= ? AND system_time <= ?
    ORDER BY system_time
  `).all(start, end) as ReadingRow[];
}
