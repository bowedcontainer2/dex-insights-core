import type { VercelRequest, VercelResponse } from '@vercel/node';
import { waitUntil } from '@vercel/functions';
import { requireAuth, AuthError } from '../../lib/auth.js';
import { fetchLatestReadings } from '../../lib/dexcom.js';
import { loginById } from '../../lib/dexcom.js';
import { storeReadings, getReadingsByRange } from '../../lib/readingStore.js';
import { storePatternEvents, upsertDailyStats } from '../../lib/patternStore.js';
import { analyzeDay } from '../../lib/patternEngine.js';
import { generateInsights } from '../../lib/insightEngine.js';
import { getDexcomSession, getProfile, saveDexcomSession } from '../../lib/profileStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);

    const dexSession = await getDexcomSession(userId);
    if (!dexSession) {
      return res.status(400).json({ error: 'Dexcom not connected' });
    }

    const profile = await getProfile(userId);
    const timezone = profile?.timezone ?? 'America/New_York';

    const hours = parseInt(req.query.hours as string) || 24;
    const minutes = hours * 60;
    const maxCount = Math.min(minutes / 5, 288);

    let data;
    try {
      data = await fetchLatestReadings(dexSession.sessionId, dexSession.baseUrl, minutes, maxCount);
    } catch (fetchErr: any) {
      // If session expired, re-auth using stored credentials and retry once
      if (fetchErr.message?.includes('500') && profile?.dexcomPassword && profile?.dexcomAccountId) {
        const newSessionId = await loginById(profile.dexcomAccountId, profile.dexcomPassword, dexSession.baseUrl);
        await saveDexcomSession(userId, newSessionId, dexSession.accountId, dexSession.baseUrl);
        data = await fetchLatestReadings(newSessionId, dexSession.baseUrl, minutes, maxCount);
      } else {
        throw fetchErr;
      }
    }

    // Store readings
    try {
      await storeReadings(userId, data.egvs);
    } catch (storeErr) {
      console.error('Reading store error:', storeErr);
    }

    // Merge API data with stored readings to fill gaps
    const rangeStart = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const rangeEnd = new Date().toISOString();
    const storedRows = await getReadingsByRange(userId, rangeStart, rangeEnd);

    const merged = new Map<string, typeof data.egvs[0]>();
    for (const row of storedRows) {
      merged.set(row.system_time, {
        value: row.value,
        trend: row.trend as any,
        trendRate: row.trend_rate,
        systemTime: row.system_time,
        displayTime: row.system_time,
      });
    }
    for (const egv of data.egvs) {
      merged.set(egv.systemTime, egv);
    }

    const mergedEgvs = [...merged.values()].sort(
      (a, b) => new Date(a.systemTime).getTime() - new Date(b.systemTime).getTime()
    );

    res.json({ ...data, egvs: mergedEgvs });

    // Fire-and-forget: pattern analysis + insights via waitUntil
    waitUntil(
      (async () => {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const todayReadings = await getReadingsByRange(
            userId,
            today,
            today + 'T23:59:59'
          );
          const readingRows = todayReadings.map((r) => ({
            value: r.value,
            trend: r.trend,
            trend_rate: r.trend_rate,
            system_time: r.system_time,
          }));
          const { events, stats } = analyzeDay(readingRows, today, timezone);
          if (events.length > 0) await storePatternEvents(userId, events);
          if (stats) await upsertDailyStats(userId, today, stats);

          await generateInsights(userId, timezone);
        } catch (err) {
          console.error('Background analysis error:', err);
        }
      })()
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('EGV fetch error:', err);
    if (err.message?.includes('500')) {
      return res.status(401).json({ error: 'Session expired' });
    }
    res.status(500).json({ error: 'Failed to fetch glucose data' });
  }
}
