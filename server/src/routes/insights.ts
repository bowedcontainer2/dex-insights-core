import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { getInsightForDate, getLatestInsight } from '../services/insightStore.js';

const router = Router();

router.use(authGuard);

router.get('/', (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const insight = getInsightForDate(today) ?? getLatestInsight();

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
  } catch (err) {
    console.error('Insights fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

export default router;
