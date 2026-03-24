import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { getPatternEventsByRange, getDailyStatsByRange } from '../services/patternStore.js';
import { getSeverity } from '../services/patternEngine.js';
import type { PatternType, PatternSummary, PatternsResponse } from '../../../shared/types.js';

const router = Router();

router.use(authGuard);

const ALL_PATTERN_TYPES: PatternType[] = [
  'morning_spike',
  'rapid_rise',
  'rapid_drop',
  'prolonged_high',
  'prolonged_low',
  'nocturnal_low',
  'high_variability',
  'elevated_overnight',
  'post_meal_crash',
];

router.get('/', (req: Request, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);

    const today = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const events = getPatternEventsByRange(startDate, today);
    const windowStats = getDailyStatsByRange(startDate, today);
    const todayStats = windowStats.find((s) => s.date === today) ?? null;

    const daysWithData = windowStats.length;

    const SEVERITY_ORDER = { severe: 0, moderate: 1, mild: 2 } as const;

    const summaries: PatternSummary[] = ALL_PATTERN_TYPES
      .map((type): PatternSummary => {
        const typeEvents = events.filter((e) => e.patternType === type);
        const uniqueDates = new Set(typeEvents.map((e) => e.detectedDate));
        const occurrences = uniqueDates.size;
        const conviction = daysWithData > 0 ? occurrences / daysWithData : 0;
        const todayDetected = uniqueDates.has(today);
        const latestEvent = typeEvents[0]; // already sorted DESC

        const avgMagnitude = typeEvents.length > 0
          ? Math.round((typeEvents.reduce((sum, e) => sum + e.magnitude, 0) / typeEvents.length) * 10) / 10
          : 0;
        const severity = getSeverity(type, avgMagnitude);

        return {
          type,
          conviction,
          occurrences,
          windowDays: days,
          daysWithData,
          todayDetected,
          latestEvent,
          severity,
          avgMagnitude,
        };
      })
      .filter((s) => s.occurrences >= 2 && s.severity !== 'mild')
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.conviction - a.conviction)
      .slice(0, 3);

    const response: PatternsResponse = {
      patterns: summaries,
      todayStats,
      windowStats,
    };

    res.json(response);
  } catch (err) {
    console.error('Patterns fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

export default router;
