import type { DexcomTrend, GlucoseRange } from '../types/dexcom';

export function classifyRange(value: number): GlucoseRange {
  if (value < 54) return 'urgent_low';
  if (value < 70) return 'low';
  if (value <= 180) return 'in_range';
  if (value <= 250) return 'high';
  return 'urgent_high';
}

export function trendArrow(trend: DexcomTrend): string {
  const arrows: Record<string, string> = {
    doubleUp: '\u2191\u2191',
    singleUp: '\u2191',
    fortyFiveUp: '\u2197',
    flat: '\u2192',
    fortyFiveDown: '\u2198',
    singleDown: '\u2193',
    doubleDown: '\u2193\u2193',
    none: '-',
    notComputable: '?',
    rateOutOfRange: '!!',
  };
  return arrows[trend] || '-';
}

export function trendDescription(trend: DexcomTrend): string {
  const descriptions: Record<string, string> = {
    doubleUp: 'Rising rapidly',
    singleUp: 'Rising',
    fortyFiveUp: 'Rising slowly',
    flat: 'Steady',
    fortyFiveDown: 'Falling slowly',
    singleDown: 'Falling',
    doubleDown: 'Falling rapidly',
    none: 'No trend',
    notComputable: 'Not computable',
    rateOutOfRange: 'Rate out of range',
  };
  return descriptions[trend] || 'Unknown';
}

export function formatRate(rate: number | null): string {
  if (rate === null) return '';
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(1)} mg/dL/min`;
}

export function isStale(timestamp: string, thresholdMinutes = 10): boolean {
  const diff = Date.now() - new Date(timestamp).getTime();
  return diff > thresholdMinutes * 60 * 1000;
}
