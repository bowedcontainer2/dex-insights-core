import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { fetchLatestReadings } from '../services/dexcom.js';
import { storeReadings, getReadingsForDate, getReadingsByRange } from '../services/readingStore.js';
import { storePatternEvents, upsertDailyStats } from '../services/patternStore.js';
import { analyzeDay } from '../services/patternEngine.js';
import { generateInsights } from '../services/insightEngine.js';
import { getDexcomSession } from '../../../lib/profileStore.js';

const router = Router();

router.use(authGuard);

async function resolveDexcomSession(req: Request): Promise<{ sessionId: string; baseUrl: string }> {
  // Try database lookup via JWT userId first
  if (req.userId) {
    const dbSession = await getDexcomSession(req.userId);
    if (dbSession) return dbSession;
  }
  // Fall back to express-session
  if (req.session.sessionId) {
    return { sessionId: req.session.sessionId, baseUrl: '' };
  }
  throw new Error('No Dexcom session found');
}

router.get('/egvs', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const minutes = hours * 60;
    const maxCount = Math.min(minutes / 5, 288);

    const dexSession = await resolveDexcomSession(req);
    const data = await fetchLatestReadings(dexSession.sessionId, minutes, maxCount, dexSession.baseUrl || undefined);

    // Store first so SQLite has the latest readings for the merge
    try {
      storeReadings(data.egvs);
    } catch (storeErr) {
      console.error('Reading store error:', storeErr);
    }

    // Merge API data with stored readings to fill gaps
    const rangeStart = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const rangeEnd = new Date().toISOString();
    const storedRows = getReadingsByRange(rangeStart, rangeEnd);

    // Build a map keyed by systemTime — stored readings first, API overwrites
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

    // Fire-and-forget: run pattern analysis
    try {
      const today = new Date().toISOString().slice(0, 10);
      const todayReadings = getReadingsForDate(today);
      const { events, stats } = analyzeDay(todayReadings, today);
      if (events.length > 0) storePatternEvents(events);
      if (stats) upsertDailyStats(today, stats);

      // Once-daily LLM insight generation (fire-and-forget)
      generateInsights().catch((err) => {
        console.error('Insight generation error:', err);
      });
    } catch (storageErr) {
      console.error('Storage side-effect error:', storageErr);
    }
  } catch (err: any) {
    console.error('EGV fetch error:', err);
    if (err.message?.includes('500')) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch glucose data' });
  }
});

router.get('/current', async (req: Request, res: Response) => {
  try {
    const dexSession = await resolveDexcomSession(req);
    const data = await fetchLatestReadings(dexSession.sessionId, 30, 1, dexSession.baseUrl || undefined);

    if (data.egvs.length === 0) {
      res.json({ reading: null });
      return;
    }

    const latest = data.egvs[data.egvs.length - 1];
    res.json({ reading: latest });
  } catch (err: any) {
    console.error('Current reading error:', err);
    if (err.message?.includes('500')) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch current reading' });
  }
});

export default router;
