import type { PatternEvent, PatternType, DailyStats } from '../shared/types.js';

// ── Severity Classification ───────────────────────────────────────

type Severity = 'mild' | 'moderate' | 'severe';

const SEVERITY_THRESHOLDS: Record<PatternType, [number, number]> = {
  // [moderate_threshold, severe_threshold]
  morning_spike:     [80,  120],  // mg/dL delta
  rapid_rise:        [85,  120],  // mg/dL in ~30 min
  rapid_drop:        [85,  120],  // mg/dL in ~30 min
  prolonged_high:    [60,  120],  // minutes above 180
  prolonged_low:     [30,   60],  // minutes below 70
  nocturnal_low:     [20,   45],  // minutes below 70 asleep — more aggressive
  high_variability:  [42,   50],  // CV%
  elevated_overnight:[160, 200],  // mg/dL avg
  post_meal_crash:   [25,   40],  // mg/dL overshoot below baseline
};

export function getSeverity(type: PatternType, magnitude: number): Severity {
  const [moderate, severe] = SEVERITY_THRESHOLDS[type];
  if (magnitude >= severe) return 'severe';
  if (magnitude >= moderate) return 'moderate';
  return 'mild';
}

interface Reading {
  value: number;
  trend: string;
  trend_rate: number | null;
  system_time: string;
}

function toLocalHour(utcTimeStr: string, timezone: string): number {
  const utc = new Date(utcTimeStr);
  const local = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
  return local.getHours() + local.getMinutes() / 60;
}

// ── Morning Spike (Dawn Phenomenon) ────────────────────────────────

export function detectMorningSpike(readings: Reading[], date: string, timezone: string): PatternEvent[] {
  const nightReadings = readings.filter((r) => {
    const h = toLocalHour(r.system_time, timezone);
    return h >= 3 && h <= 5;
  });
  const morningReadings = readings.filter((r) => {
    const h = toLocalHour(r.system_time, timezone);
    return h >= 6 && h <= 9.5;
  });

  if (nightReadings.length === 0 || morningReadings.length === 0) return [];

  const nightMin = Math.min(...nightReadings.map((r) => r.value));
  const morningMax = Math.max(...morningReadings.map((r) => r.value));
  const delta = morningMax - nightMin;

  if (delta < 30) return [];

  const peakReading = morningReadings.find((r) => r.value === morningMax)!;
  return [{
    patternType: 'morning_spike',
    detectedDate: date,
    startTime: nightReadings[0].system_time,
    endTime: peakReading.system_time,
    magnitude: delta,
  }];
}

// ── Rapid Rise (Post-Meal) ─────────────────────────────────────────

export function detectRapidRise(readings: Reading[], date: string): PatternEvent[] {
  const events: PatternEvent[] = [];
  for (let i = 0; i <= readings.length - 6; i++) {
    const rise = readings[i + 5].value - readings[i].value;
    if (rise >= 40) {
      const last = events[events.length - 1];
      if (last) {
        const lastEndMs = new Date(last.endTime!).getTime();
        const thisStartMs = new Date(readings[i].system_time).getTime();
        if (thisStartMs - lastEndMs < 15 * 60 * 1000) {
          last.endTime = readings[i + 5].system_time;
          last.magnitude = Math.max(last.magnitude, rise);
          continue;
        }
      }
      events.push({
        patternType: 'rapid_rise',
        detectedDate: date,
        startTime: readings[i].system_time,
        endTime: readings[i + 5].system_time,
        magnitude: rise,
      });
    }
  }
  return events;
}

// ── Rapid Drop ─────────────────────────────────────────────────────

export function detectRapidDrop(readings: Reading[], date: string): PatternEvent[] {
  const events: PatternEvent[] = [];
  for (let i = 0; i <= readings.length - 6; i++) {
    const drop = readings[i].value - readings[i + 5].value;
    if (drop >= 40) {
      const last = events[events.length - 1];
      if (last) {
        const lastEndMs = new Date(last.endTime!).getTime();
        const thisStartMs = new Date(readings[i].system_time).getTime();
        if (thisStartMs - lastEndMs < 15 * 60 * 1000) {
          last.endTime = readings[i + 5].system_time;
          last.magnitude = Math.max(last.magnitude, drop);
          continue;
        }
      }
      events.push({
        patternType: 'rapid_drop',
        detectedDate: date,
        startTime: readings[i].system_time,
        endTime: readings[i + 5].system_time,
        magnitude: drop,
      });
    }
  }
  return events;
}

// ── Prolonged High ─────────────────────────────────────────────────

export function detectProlongedHigh(readings: Reading[], date: string): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streakStart = -1;

  for (let i = 0; i <= readings.length; i++) {
    const isHigh = i < readings.length && readings[i].value > 180;
    if (isHigh && streakStart === -1) {
      streakStart = i;
    } else if (!isHigh && streakStart !== -1) {
      const count = i - streakStart;
      if (count >= 6) {
        const durationMin = count * 5;
        events.push({
          patternType: 'prolonged_high',
          detectedDate: date,
          startTime: readings[streakStart].system_time,
          endTime: readings[i - 1].system_time,
          magnitude: durationMin,
        });
      }
      streakStart = -1;
    }
  }
  return events;
}

// ── Prolonged Low ──────────────────────────────────────────────────

export function detectProlongedLow(readings: Reading[], date: string): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streakStart = -1;

  for (let i = 0; i <= readings.length; i++) {
    const isLow = i < readings.length && readings[i].value < 70;
    if (isLow && streakStart === -1) {
      streakStart = i;
    } else if (!isLow && streakStart !== -1) {
      const count = i - streakStart;
      if (count >= 3) {
        const durationMin = count * 5;
        events.push({
          patternType: 'prolonged_low',
          detectedDate: date,
          startTime: readings[streakStart].system_time,
          endTime: readings[i - 1].system_time,
          magnitude: durationMin,
        });
      }
      streakStart = -1;
    }
  }
  return events;
}

// ── Nocturnal Hypoglycemia ─────────────────────────────────────────

export function detectNocturnalLow(readings: Reading[], date: string, timezone: string): PatternEvent[] {
  const events: PatternEvent[] = [];
  const nightReadings = readings.filter((r) => {
    const h = toLocalHour(r.system_time, timezone);
    return h >= 0 && h < 6;
  });

  let streakStart = -1;
  for (let i = 0; i <= nightReadings.length; i++) {
    const isLow = i < nightReadings.length && nightReadings[i].value < 70;
    if (isLow && streakStart === -1) {
      streakStart = i;
    } else if (!isLow && streakStart !== -1) {
      const count = i - streakStart;
      if (count >= 3) {
        const durationMin = count * 5;
        const nadir = Math.min(...nightReadings.slice(streakStart, i).map((r) => r.value));
        events.push({
          patternType: 'nocturnal_low',
          detectedDate: date,
          startTime: nightReadings[streakStart].system_time,
          endTime: nightReadings[i - 1].system_time,
          magnitude: durationMin,
          metadata: { nadir },
        });
      }
      streakStart = -1;
    }
  }
  return events;
}

// ── High Glycemic Variability ─────────────────────────────────────

export function detectHighVariability(readings: Reading[], date: string): PatternEvent[] {
  if (readings.length < 12) return [];

  const values = readings.map((r) => r.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

  if (cv < 36) return [];

  return [{
    patternType: 'high_variability',
    detectedDate: date,
    startTime: readings[0].system_time,
    endTime: readings[readings.length - 1].system_time,
    magnitude: Math.round(cv * 10) / 10,
  }];
}

// ── Elevated Overnight Glucose ────────────────────────────────────

export function detectElevatedOvernight(readings: Reading[], date: string, timezone: string): PatternEvent[] {
  const nightReadings = readings.filter((r) => {
    const h = toLocalHour(r.system_time, timezone);
    return h >= 0 && h < 6;
  });

  if (nightReadings.length < 6) return [];

  const values = nightReadings.map((r) => r.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  if (avg <= 120) return [];

  return [{
    patternType: 'elevated_overnight',
    detectedDate: date,
    startTime: nightReadings[0].system_time,
    endTime: nightReadings[nightReadings.length - 1].system_time,
    magnitude: Math.round(avg),
    metadata: { avgOvernight: Math.round(avg * 10) / 10 },
  }];
}

// ── Post-Meal Crash (Reactive Hypoglycemia) ───────────────────────

export function detectPostMealCrash(readings: Reading[], date: string): PatternEvent[] {
  const events: PatternEvent[] = [];

  for (let i = 0; i < readings.length - 6; i++) {
    const baseline = readings[i].value;
    let peakIdx = -1;
    let peakVal = baseline;
    const searchEnd = Math.min(i + 18, readings.length);
    for (let j = i + 1; j < searchEnd; j++) {
      if (readings[j].value > peakVal) {
        peakVal = readings[j].value;
        peakIdx = j;
      }
    }

    const rise = peakVal - baseline;
    if (rise < 30 || peakIdx === -1) continue;

    const crashWindow = Math.min(i + 36, readings.length);
    let crashIdx = -1;
    let crashVal = peakVal;
    for (let j = peakIdx + 1; j < crashWindow; j++) {
      if (readings[j].value < crashVal) crashVal = readings[j].value;
      if (readings[j].value < baseline - 10) {
        crashIdx = j;
        break;
      }
    }

    if (crashIdx === -1) continue;

    const overshoot = baseline - readings[crashIdx].value;

    const last = events[events.length - 1];
    if (last) {
      const lastEndMs = new Date(last.endTime!).getTime();
      const thisStartMs = new Date(readings[i].system_time).getTime();
      if (thisStartMs < lastEndMs) continue;
    }

    events.push({
      patternType: 'post_meal_crash',
      detectedDate: date,
      startTime: readings[i].system_time,
      endTime: readings[crashIdx].system_time,
      magnitude: overshoot,
      metadata: { peakValue: peakVal, baseline, crashValue: readings[crashIdx].value },
    });

    i = crashIdx;
  }

  return events;
}

// ── Daily Stats ────────────────────────────────────────────────────

export function computeDailyStats(readings: Reading[]): Omit<DailyStats, 'date'> | null {
  if (readings.length === 0) return null;

  const values = readings.map((r) => r.value);
  const count = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / count;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

  const inRange = values.filter((v) => v >= 70 && v <= 180).length;
  const below = values.filter((v) => v < 70).length;
  const above = values.filter((v) => v > 180).length;

  const gmi = Math.round((3.31 + 0.02392 * mean) * 10) / 10;

  return {
    readingCount: count,
    meanGlucose: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    minGlucose: min,
    maxGlucose: max,
    timeInRangePct: Math.round((inRange / count) * 1000) / 10,
    timeBelowPct: Math.round((below / count) * 1000) / 10,
    timeAbovePct: Math.round((above / count) * 1000) / 10,
    cv: Math.round(cv * 10) / 10,
    gmi,
  };
}

// ── Orchestrator ───────────────────────────────────────────────────

export function analyzeDay(readings: Reading[], date: string, timezone: string): {
  events: PatternEvent[];
  stats: Omit<DailyStats, 'date'> | null;
} {
  const events = [
    ...detectMorningSpike(readings, date, timezone),
    ...detectRapidRise(readings, date),
    ...detectRapidDrop(readings, date),
    ...detectProlongedHigh(readings, date),
    ...detectProlongedLow(readings, date),
    ...detectNocturnalLow(readings, date, timezone),
    ...detectHighVariability(readings, date),
    ...detectElevatedOvernight(readings, date, timezone),
    ...detectPostMealCrash(readings, date),
  ];

  const stats = computeDailyStats(readings);

  return { events, stats };
}
