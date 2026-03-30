import type { PatternEvent, DailyStats } from '../shared/types.js';

interface CompactReading {
  v: number;
  t: string;
  r: number | null;
  ts: string;
}

interface GlucoseData {
  currentTime: string;
  readings: CompactReading[];
  dailyStats: DailyStats[];
  patternEvents: PatternEvent[];
}

const PATTERN_NAMES: Record<string, string> = {
  morning_spike: 'morning spike (dawn phenomenon)',
  rapid_rise: 'rapid rise',
  rapid_drop: 'rapid drop',
  prolonged_high: 'prolonged high',
  prolonged_low: 'prolonged low',
  nocturnal_low: 'overnight low',
  high_variability: 'high variability',
  elevated_overnight: 'elevated overnight',
  post_meal_crash: 'post-meal crash',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function timeBlock(hour: number): string {
  if (hour < 6) return 'overnight';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Turns raw glucose data into a ~300-500 token text narrative
 * that the LLM can reason over without parsing JSON.
 */
export function summarizeGlucoseData(data: GlucoseData): string {
  const lines: string[] = [];
  const now = new Date(data.currentTime);

  // Current reading
  if (data.readings.length > 0) {
    const latest = data.readings[data.readings.length - 1];
    const trendWord = describeTrend(latest.t);
    lines.push(`Right now: ${latest.v} mg/dL, ${trendWord}.`);
  }

  // Today's stats (most recent day in dailyStats)
  if (data.dailyStats.length > 0) {
    const today = data.dailyStats[0]; // sorted desc
    lines.push(`Today so far: mean ${Math.round(today.meanGlucose)}, range ${today.minGlucose}–${today.maxGlucose}, ${Math.round(today.timeInRangePct)}% in range, ${Math.round(today.timeBelowPct)}% low, ${Math.round(today.timeAbovePct)}% high.`);
  }

  // Recent trajectory — summarize readings into time blocks
  if (data.readings.length > 10) {
    const trajectory = summarizeTrajectory(data.readings);
    if (trajectory) lines.push(trajectory);
  }

  // Pattern events
  if (data.patternEvents.length > 0) {
    const patternSummary = summarizePatterns(data.patternEvents);
    lines.push(patternSummary);
  }

  // Comparison to recent days
  if (data.dailyStats.length > 1) {
    const comparison = compareToRecentDays(data.dailyStats);
    if (comparison) lines.push(comparison);
  }

  return lines.join('\n');
}

function describeTrend(trend: string): string {
  switch (trend) {
    case 'doubleUp': return 'rising fast';
    case 'singleUp': return 'rising';
    case 'fortyFiveUp': return 'rising slightly';
    case 'flat': return 'steady';
    case 'fortyFiveDown': return 'dropping slightly';
    case 'singleDown': return 'dropping';
    case 'doubleDown': return 'dropping fast';
    default: return 'trend unknown';
  }
}

function summarizeTrajectory(readings: CompactReading[]): string | null {
  // Group readings into ~2 hour blocks and describe the arc
  const blocks: { label: string; avg: number; min: number; max: number; count: number }[] = [];
  let currentBlock: typeof blocks[0] | null = null;
  let currentBlockHour = -1;

  for (const r of readings) {
    const hour = new Date(r.ts).getUTCHours();
    const blockIndex = Math.floor(hour / 3); // 3-hour blocks

    if (blockIndex !== currentBlockHour) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlockHour = blockIndex;
      const blockStart = blockIndex * 3;
      const label = timeBlock(blockStart);
      currentBlock = { label, avg: r.v, min: r.v, max: r.v, count: 1 };
    } else if (currentBlock) {
      currentBlock.avg = (currentBlock.avg * currentBlock.count + r.v) / (currentBlock.count + 1);
      currentBlock.min = Math.min(currentBlock.min, r.v);
      currentBlock.max = Math.max(currentBlock.max, r.v);
      currentBlock.count++;
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  if (blocks.length < 2) return null;

  const parts = blocks.map((b) => {
    const avg = Math.round(b.avg);
    if (b.max - b.min < 30) {
      return `${b.label}: steady around ${avg}`;
    }
    return `${b.label}: ${b.min}–${b.max} (avg ${avg})`;
  });

  return `Trajectory: ${parts.join(', ')}.`;
}

function summarizePatterns(events: PatternEvent[]): string {
  // Group by type, count occurrences, mention most recent
  const byType = new Map<string, PatternEvent[]>();
  for (const e of events) {
    const arr = byType.get(e.patternType) || [];
    arr.push(e);
    byType.set(e.patternType, arr);
  }

  const parts: string[] = [];
  for (const [type, evts] of byType) {
    const name = PATTERN_NAMES[type] || type;
    const latest = evts[0];
    const mag = Math.round(latest.magnitude);
    const time = formatTime(latest.startTime);
    if (evts.length === 1) {
      parts.push(`${name} (${mag} mg/dL at ${time})`);
    } else {
      parts.push(`${name} (${evts.length}x, latest ${mag} mg/dL at ${time})`);
    }
  }

  return `Detected patterns: ${parts.join('; ')}.`;
}

function compareToRecentDays(stats: DailyStats[]): string | null {
  if (stats.length < 2) return null;
  const today = stats[0];
  const recent = stats.slice(1);
  const avgMean = recent.reduce((s, d) => s + d.meanGlucose, 0) / recent.length;
  const avgTir = recent.reduce((s, d) => s + d.timeInRangePct, 0) / recent.length;

  const meanDiff = today.meanGlucose - avgMean;
  const tirDiff = today.timeInRangePct - avgTir;

  const parts: string[] = [];
  if (Math.abs(meanDiff) > 15) {
    parts.push(`average is ${Math.abs(Math.round(meanDiff))} ${meanDiff > 0 ? 'higher' : 'lower'} than recent days`);
  }
  if (Math.abs(tirDiff) > 10) {
    parts.push(`time in range is ${Math.abs(Math.round(tirDiff))}% ${tirDiff > 0 ? 'better' : 'worse'}`);
  }

  if (parts.length === 0) return `Compared to recent days: similar overall.`;
  return `Compared to recent days: ${parts.join(', ')}.`;
}
