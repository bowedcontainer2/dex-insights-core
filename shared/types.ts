export type DexcomTrend =
  | 'doubleUp'
  | 'singleUp'
  | 'fortyFiveUp'
  | 'flat'
  | 'fortyFiveDown'
  | 'singleDown'
  | 'doubleDown'
  | 'none'
  | 'notComputable'
  | 'rateOutOfRange';

export interface DexcomEGV {
  value: number;
  trend: DexcomTrend;
  trendRate: number | null;
  systemTime: string;
  displayTime: string;
}

export interface DexcomEGVResponse {
  unit: string;
  rateUnit: string;
  egvs: DexcomEGV[];
}

export interface GlucoseReading {
  value: number;
  trend: DexcomTrend;
  trendRate: number | null;
  timestamp: string;
  range: GlucoseRange;
}

export type GlucoseRange =
  | 'urgent_low'
  | 'low'
  | 'in_range'
  | 'high'
  | 'urgent_high';

export interface AuthStatus {
  authenticated: boolean;
  expiresAt?: number;
}

// Pattern detection types

export type PatternType =
  | 'morning_spike'
  | 'rapid_rise'
  | 'rapid_drop'
  | 'prolonged_high'
  | 'prolonged_low'
  | 'nocturnal_low'
  | 'high_variability'
  | 'elevated_overnight'
  | 'post_meal_crash';

export interface PatternEvent {
  patternType: PatternType;
  detectedDate: string;
  startTime: string;
  endTime?: string;
  magnitude: number;
  metadata?: Record<string, unknown>;
}

export interface PatternSummary {
  type: PatternType;
  conviction: number;
  occurrences: number;
  windowDays: number;
  daysWithData: number;
  todayDetected: boolean;
  latestEvent?: PatternEvent;
}

export interface DailyStats {
  date: string;
  readingCount: number;
  meanGlucose: number;
  stdDev: number | null;
  minGlucose: number;
  maxGlucose: number;
  timeInRangePct: number;
  timeBelowPct: number;
  timeAbovePct: number;
  cv: number;
  gmi: number;
}

export interface PatternsResponse {
  patterns: PatternSummary[];
  todayStats: DailyStats | null;
  windowStats: DailyStats[];
}

export interface InsightsResponse {
  alert: string;
  recommendation: string;
  daySummary: string;
  source: 'llm' | 'fallback';
  generatedDate: string;
}
