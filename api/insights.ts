import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthError } from '../lib/auth.js';
import { getInsightForDate, getLatestInsight } from '../lib/insightStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);

    const today = new Date().toISOString().slice(0, 10);
    const insight = await getInsightForDate(userId, today) ?? await getLatestInsight(userId);

    if (insight) {
      res.json({
        alert: insight.alertText,
        recommendation: insight.recommendationText,
        daySummary: insight.daySummaryText,
        source: 'llm' as const,
        generatedDate: insight.generatedDate,
      });
    } else {
      res.json({
        alert: '',
        recommendation: '',
        daySummary: '',
        source: 'fallback' as const,
        generatedDate: today,
      });
    }
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Insights fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
}
