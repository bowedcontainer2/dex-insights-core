import { describe, it, expect } from 'vitest';

import {
  computeDailyStats,
  detectRapidRise,
  detectRapidDrop,
  detectProlongedHigh,
  detectProlongedLow,
  detectMorningSpike,
  detectNocturnalLow,
  detectHighVariability,
  detectElevatedOvernight,
  detectPostMealCrash,
  analyzeDay,
} from './patternEngine.js';

interface Reading {
  value: number;
  trend: string;
  trend_rate: number | null;
  system_time: string;
}

/** Generate readings at 5-min intervals starting from a UTC ISO string. */
function makeReadings(startTime: string, values: number[], intervalMin = 5): Reading[] {
  const start = new Date(startTime).getTime();
  return values.map((value, i) => ({
    value,
    trend: 'flat',
    trend_rate: null,
    system_time: new Date(start + i * intervalMin * 60_000).toISOString(),
  }));
}

const DATE = '2025-06-15';
const TZ = 'America/New_York';

// ── computeDailyStats ──────────────────────────────────────────────

describe('computeDailyStats', () => {
  it('returns null for empty array', () => {
    expect(computeDailyStats([])).toBeNull();
  });

  it('computes correct mean, min, max, stdDev, cv, gmi', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [100, 120, 140, 160, 180]);
    const stats = computeDailyStats(readings)!;

    expect(stats.readingCount).toBe(5);
    expect(stats.meanGlucose).toBe(140);
    expect(stats.minGlucose).toBe(100);
    expect(stats.maxGlucose).toBe(180);

    expect(stats.stdDev).toBeCloseTo(28.3, 0);
    expect(stats.cv).toBeCloseTo(20.2, 0);
    expect(stats.gmi).toBe(6.7);
  });

  it('computes time-in-range percentages', () => {
    const values = [50, 55, 60, 100, 120, 140, 170, 200, 220, 250];
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    const stats = computeDailyStats(readings)!;

    expect(stats.timeBelowPct).toBe(30);
    expect(stats.timeInRangePct).toBe(40);
    expect(stats.timeAbovePct).toBe(30);
  });
});

// ── detectRapidRise ────────────────────────────────────────────────

describe('detectRapidRise', () => {
  it('no event when rise < 40 in 30 min', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [100, 105, 110, 115, 120, 129]);
    expect(detectRapidRise(readings, DATE)).toHaveLength(0);
  });

  it('one event when rise >= 40 in 6 readings', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [100, 110, 120, 130, 135, 140]);
    const events = detectRapidRise(readings, DATE);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('rapid_rise');
    expect(events[0].magnitude).toBe(40);
  });

  it('merges overlapping events within 15 min', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [
      100, 110, 120, 130, 140, 150, 160, 170, 180,
    ]);
    const events = detectRapidRise(readings, DATE);
    expect(events).toHaveLength(1);
  });

  it('multiple separate events when gap > 15 min', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [
      100, 110, 120, 130, 135, 140,
      140, 140, 140, 140,
      100, 110, 120, 130, 135, 140,
    ]);
    const events = detectRapidRise(readings, DATE);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });
});

// ── detectRapidDrop ────────────────────────────────────────────────

describe('detectRapidDrop', () => {
  it('no event when drop < 40', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [130, 125, 120, 115, 110, 100]);
    expect(detectRapidDrop(readings, DATE)).toHaveLength(0);
  });

  it('one event when drop >= 40', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [180, 170, 160, 150, 145, 140]);
    const events = detectRapidDrop(readings, DATE);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('rapid_drop');
    expect(events[0].magnitude).toBe(40);
  });
});

// ── detectProlongedHigh ────────────────────────────────────────────

describe('detectProlongedHigh', () => {
  it('no event for 5 consecutive readings > 180', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [200, 200, 200, 200, 200, 100]);
    expect(detectProlongedHigh(readings, DATE)).toHaveLength(0);
  });

  it('event for 6+ consecutive readings > 180', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [200, 200, 200, 200, 200, 200, 100]);
    const events = detectProlongedHigh(readings, DATE);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('prolonged_high');
    expect(events[0].magnitude).toBe(30);
  });

  it('multiple events separated by an in-range reading', () => {
    const values = [
      ...Array(6).fill(200),
      100,
      ...Array(6).fill(200),
    ];
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    expect(detectProlongedHigh(readings, DATE)).toHaveLength(2);
  });
});

// ── detectProlongedLow ─────────────────────────────────────────────

describe('detectProlongedLow', () => {
  it('no event for 2 consecutive readings < 70', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [60, 60, 100]);
    expect(detectProlongedLow(readings, DATE)).toHaveLength(0);
  });

  it('event for 3+ consecutive readings < 70', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', [60, 55, 65, 100]);
    const events = detectProlongedLow(readings, DATE);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('prolonged_low');
    expect(events[0].magnitude).toBe(15);
  });
});

// ── detectMorningSpike ─────────────────────────────────────────────

describe('detectMorningSpike', () => {
  it('no event when delta < 30', () => {
    const nightReadings = makeReadings('2025-06-15T07:00:00Z', [100, 100, 100]);
    const morningReadings = makeReadings('2025-06-15T10:00:00Z', [120, 125, 128]);
    const readings = [...nightReadings, ...morningReadings];
    expect(detectMorningSpike(readings, DATE, TZ)).toHaveLength(0);
  });

  it('event when night-min to morning-max >= 30', () => {
    const nightReadings = makeReadings('2025-06-15T07:00:00Z', [90, 85, 88]);
    const morningReadings = makeReadings('2025-06-15T10:00:00Z', [130, 145, 120]);
    const readings = [...nightReadings, ...morningReadings];
    const events = detectMorningSpike(readings, DATE, TZ);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('morning_spike');
    expect(events[0].magnitude).toBe(60);
  });

  it('no event when no readings in the required windows', () => {
    const readings = makeReadings('2025-06-15T16:00:00Z', [80, 85, 90, 130, 150]);
    expect(detectMorningSpike(readings, DATE, TZ)).toHaveLength(0);
  });
});

// ── detectNocturnalLow ─────────────────────────────────────────────

describe('detectNocturnalLow', () => {
  it('event when 3+ consecutive readings < 70 during 0-6 AM local', () => {
    const readings = makeReadings('2025-06-15T06:00:00Z', [60, 55, 50, 100]);
    const events = detectNocturnalLow(readings, DATE, TZ);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('nocturnal_low');
    expect(events[0].metadata).toBeDefined();
    expect(events[0].metadata!.nadir).toBe(50);
  });

  it('no event outside the 0-6 AM window', () => {
    const readings = makeReadings('2025-06-15T18:00:00Z', [60, 55, 50, 100]);
    expect(detectNocturnalLow(readings, DATE, TZ)).toHaveLength(0);
  });
});

// ── detectHighVariability ──────────────────────────────────────────

describe('detectHighVariability', () => {
  it('no event with < 12 readings', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', Array(11).fill(100));
    expect(detectHighVariability(readings, DATE)).toHaveLength(0);
  });

  it('no event when CV < 36%', () => {
    const readings = makeReadings('2025-06-15T12:00:00Z', Array(12).fill(120));
    expect(detectHighVariability(readings, DATE)).toHaveLength(0);
  });

  it('event when CV >= 36%', () => {
    const values = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 60 : 200));
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    const events = detectHighVariability(readings, DATE);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('high_variability');
    expect(events[0].magnitude).toBeGreaterThanOrEqual(36);
  });
});

// ── detectElevatedOvernight ────────────────────────────────────────

describe('detectElevatedOvernight', () => {
  it('no event with < 6 overnight readings', () => {
    const readings = makeReadings('2025-06-15T06:00:00Z', [150, 150, 150, 150, 150]);
    expect(detectElevatedOvernight(readings, DATE, TZ)).toHaveLength(0);
  });

  it('no event when avg <= 120', () => {
    const readings = makeReadings('2025-06-15T06:00:00Z', [100, 110, 115, 120, 125, 110]);
    expect(detectElevatedOvernight(readings, DATE, TZ)).toHaveLength(0);
  });

  it('event when avg > 120, magnitude = rounded avg', () => {
    const readings = makeReadings('2025-06-15T05:00:00Z', [150, 160, 140, 155, 145, 150]);
    const events = detectElevatedOvernight(readings, DATE, TZ);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('elevated_overnight');
    expect(events[0].magnitude).toBe(150);
  });
});

// ── detectPostMealCrash ────────────────────────────────────────────

describe('detectPostMealCrash', () => {
  it('event: rise 30+ → peak → drop 10+ below baseline', () => {
    const values = [100, 115, 130, 145, 130, 115, 100, 90, 85];
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    const events = detectPostMealCrash(readings, DATE);
    expect(events).toHaveLength(1);
    expect(events[0].patternType).toBe('post_meal_crash');
    expect(events[0].metadata!.peakValue).toBe(145);
    expect(events[0].metadata!.baseline).toBe(100);
    expect(events[0].metadata!.crashValue).toBe(85);
  });

  it('no event when rise < 30', () => {
    const values = [100, 110, 120, 125, 115, 100, 85];
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    expect(detectPostMealCrash(readings, DATE)).toHaveLength(0);
  });

  it('no event when no crash below baseline - 10', () => {
    const values = [100, 115, 130, 140, 130, 120, 110, 100, 95];
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    expect(detectPostMealCrash(readings, DATE)).toHaveLength(0);
  });

  it('skips duplicate overlapping events', () => {
    const values = [100, 120, 140, 150, 140, 120, 100, 85, 80, 85, 100];
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    const events = detectPostMealCrash(readings, DATE);
    expect(events).toHaveLength(1);
  });
});

// ── analyzeDay ─────────────────────────────────────────────────────

describe('analyzeDay', () => {
  it('empty readings → empty events + null stats', () => {
    const result = analyzeDay([], DATE, TZ);
    expect(result.events).toHaveLength(0);
    expect(result.stats).toBeNull();
  });

  it('returns combined events from all detectors + stats', () => {
    const values = [200, 210, 220, 230, 240, 250, 100];
    const readings = makeReadings('2025-06-15T12:00:00Z', values);
    const result = analyzeDay(readings, DATE, TZ);

    expect(result.stats).not.toBeNull();
    expect(result.stats!.readingCount).toBe(7);

    const highEvents = result.events.filter((e) => e.patternType === 'prolonged_high');
    expect(highEvents).toHaveLength(1);
  });
});
