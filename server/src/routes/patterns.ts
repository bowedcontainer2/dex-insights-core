import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { getPatternEventsByRange, getDailyStatsByRange } from '../services/patternStore.js';
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

    const summaries: PatternSummary[] = ALL_PATTERN_TYPES
      .map((type): PatternSummary => {
        const typeEvents = events.filter((e) => e.patternType === type);
        // Count unique dates with this pattern
        const uniqueDates = new Set(typeEvents.map((e) => e.detectedDate));
        const occurrences = uniqueDates.size;
        const conviction = daysWithData > 0 ? occurrences / daysWithData : 0;
        const todayDetected = uniqueDates.has(today);
        const latestEvent = typeEvents[0]; // already sorted DESC

        return {
          type,
          conviction,
          occurrences,
          windowDays: days,
          daysWithData,
          todayDetected,
          latestEvent,
        };
      })
      .filter((s) => s.occurrences >= 2); // Require pattern on 2+ days to surface

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
