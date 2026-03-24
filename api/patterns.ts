import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthError } from '../lib/auth.js';
import { getPatternEventsByRange, getDailyStatsByRange } from '../lib/patternStore.js';
import { getSeverity } from '../lib/patternEngine.js';
import type { PatternType, PatternSummary, PatternsResponse } from '../shared/types.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);

    const days = Math.min(parseInt(req.query.days as string) || 7, 30);

    const today = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const events = await getPatternEventsByRange(userId, startDate, today);
    const windowStats = await getDailyStatsByRange(userId, startDate, today);
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
        const latestEvent = typeEvents[0];

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
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Patterns fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
}
