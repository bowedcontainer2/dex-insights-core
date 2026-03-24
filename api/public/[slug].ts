import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveSlug } from '../../lib/publicProfile.js';
import { getReadingsByRange } from '../../lib/readingStore.js';
import { getPatternEventsByRange, getDailyStatsByRange } from '../../lib/patternStore.js';
import { getLatestInsight } from '../../lib/insightStore.js';
import { getSeverity } from '../../lib/patternEngine.js';
import type { PatternType, PatternSummary, DexcomEGV, PublicDashboardData } from '../../shared/types.js';

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
    const slug = req.query.slug as string;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Missing slug' });
    }

    const profile = await resolveSlug(slug);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { userId, displayName } = profile;

    // Date ranges
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Fetch all data in parallel
    const [readings, events, windowStats, latestInsight] = await Promise.all([
      getReadingsByRange(userId, twentyFourHoursAgo, now.toISOString()),
      getPatternEventsByRange(userId, sevenDaysAgo, today),
      getDailyStatsByRange(userId, sevenDaysAgo, today),
      getLatestInsight(userId),
    ]);

    // Map readings to EGV format
    const egvs: DexcomEGV[] = readings.map((r) => ({
      value: r.value,
      trend: r.trend as DexcomEGV['trend'],
      trendRate: r.trend_rate,
      systemTime: r.system_time,
      displayTime: r.system_time,
    }));

    // Current reading = most recent
    const currentReading = egvs.length > 0 ? egvs[egvs.length - 1] : null;

    // Summarize patterns (same logic as api/patterns.ts)
    const todayStats = windowStats.find((s) => s.date === today) ?? null;
    const daysWithData = windowStats.length;
    const SEVERITY_ORDER = { severe: 0, moderate: 1, mild: 2 } as const;

    const patterns: PatternSummary[] = ALL_PATTERN_TYPES
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
          type, conviction, occurrences, windowDays: 7, daysWithData,
          todayDetected, latestEvent, severity, avgMagnitude,
        };
      })
      .filter((s) => s.occurrences >= 2 && s.severity !== 'mild')
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.conviction - a.conviction)
      .slice(0, 3);

    // Format insight
    const insight = latestInsight ? {
      alert: latestInsight.alertText,
      recommendation: latestInsight.recommendationText,
      daySummary: latestInsight.daySummaryText,
      source: 'llm' as const,
      generatedDate: latestInsight.generatedDate,
    } : null;

    const response: PublicDashboardData = {
      displayName,
      currentReading,
      egvs,
      patterns,
      todayStats,
      windowStats,
      insight,
    };

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.json(response);
  } catch (err) {
    console.error('Public profile error:', err);
    res.status(500).json({ error: 'Failed to fetch public profile' });
  }
}
