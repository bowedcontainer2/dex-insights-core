import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { authGuard } from '../middleware/authGuard.js';
import { config } from '../config.js';
import { getReadingsByRange } from '../services/readingStore.js';
import { getPatternEventsByRange, getDailyStatsByRange } from '../services/patternStore.js';
import type { QuickAskKey } from '../../../shared/types.js';

const router = Router();

router.use(authGuard);

const VALID_KEYS: QuickAskKey[] = ['last_night', 'today_so_far', 'tonight_outlook', 'spike_normal'];

const QUESTIONS: Record<QuickAskKey, string> = {
  last_night: 'How was last night? Analyze my overnight glucose patterns, including any lows, highs, or instability while I slept.',
  today_so_far: "How's my day going? Analyze my glucose readings from today so far — any spikes, drops, or trends worth noting.",
  tonight_outlook: 'What should I watch out for tonight? Based on my recent patterns and today\'s data, what can I expect overnight?',
  spike_normal: 'Is my current reading or most recent spike normal for me? Compare it against my historical patterns from the past week.',
};

// How far back to pull readings per question type
const READING_HOURS: Record<QuickAskKey, number> = {
  last_night: 12,
  today_so_far: 16,
  tonight_outlook: 24,
  spike_normal: 24,
};

const CONTEXT_DAYS: Record<QuickAskKey, number> = {
  last_night: 3,
  today_so_far: 3,
  tonight_outlook: 5,
  spike_normal: 7,
};

function buildQuickAskData(questionKey: QuickAskKey) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const readingHours = READING_HOURS[questionKey];
  const contextDays = CONTEXT_DAYS[questionKey];

  const readingsStart = new Date(now.getTime() - readingHours * 60 * 60 * 1000).toISOString();
  const statsStart = new Date(now.getTime() - contextDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const readings = getReadingsByRange(readingsStart, now.toISOString());
  const dailyStats = getDailyStatsByRange(statsStart, today);
  const patternEvents = getPatternEventsByRange(statsStart, today);

  const compactReadings = readings.map((r) => ({
    v: r.value,
    t: r.trend,
    r: r.trend_rate,
    ts: r.system_time,
  }));

  return {
    currentTime: now.toISOString(),
    readings: compactReadings,
    dailyStats,
    patternEvents,
  };
}

const QUICKASK_SYSTEM_PROMPT = `You're a friendly companion helping someone understand their glucose data. Answer like a supportive friend who knows a lot about diabetes management.

TONE:
- Calm and supportive. DO NOT open with dramatic filler like "Rough stretch!", "Ugh", "Tough day", "Not great". Just answer the question.
- Keep it short. Imagine you're texting a friend, not writing a report.
- Use at most 1-2 specific numbers per answer. The user can see their own numbers on the dashboard — your job is to give meaning and context, not recite data back to them.
- Never mention SD, CV, averages, or percentages. Never list multiple timestamps.
- Use "you" language and plain time formats: "this afternoon", "around 2 PM", "overnight".

WHAT MAKES A GOOD ANSWER:
- Compare to their own history: "This is higher than your usual — you were cruising in the 140s a couple days ago."
- Answer the implicit "why" when the data shape suggests it: "That spike came on fast, which usually means quick carbs without much to slow them down."
- One concrete thing to do RIGHT NOW: "A quick walk in the next 30 minutes would help bring this down." Not generic advice.
- If things are going well, say so! People with diabetes rarely hear that.

SAFETY:
- You are NOT a doctor. Never diagnose or prescribe.
- Casual hedging: "might help", "worth trying", "could be worth a look".
- Skip "consult your healthcare provider" boilerplate unless discussing medication.

RESPONSE FORMAT:
- 2-3 short sentences max. Plain text, no markdown, no bullets, no lists.
- Answer the question → one key insight → one thing to do.`;

// Simple in-memory rate limiting: max 20 asks per user per day
const rateLimitMap = new Map<string, number>();

function checkRateLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const key = `single:${today}`;
  const count = rateLimitMap.get(key) ?? 0;
  if (count >= 20) return false;
  rateLimitMap.set(key, count + 1);
  return true;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { questionKey, customQuery } = req.body ?? {};

    const isPrefire = questionKey && VALID_KEYS.includes(questionKey);
    const isCustom = typeof customQuery === 'string' && customQuery.trim().length > 0;
    if (!isPrefire && !isCustom) {
      return res.status(400).json({ error: 'Provide a valid questionKey or customQuery' });
    }

    if (!checkRateLimit()) {
      return res.status(429).json({ error: 'Daily question limit reached. Try again tomorrow.' });
    }

    const dataKey = isPrefire ? (questionKey as QuickAskKey) : 'spike_normal';
    const promptData = buildQuickAskData(dataKey);

    if (promptData.readings.length === 0) {
      return res.json({
        answer: 'No glucose data available yet. Connect your Dexcom and check back once readings start flowing in.',
        questionKey: questionKey ?? 'custom',
      });
    }

    const userQuestion = isPrefire ? QUESTIONS[questionKey as QuickAskKey] : customQuery!.trim();

    const client = new OpenAI({ apiKey: config.openai.apiKey });

    const response = await client.chat.completions.create({
      model: config.openai.model,
      max_completion_tokens: 4096,
      messages: [
        { role: 'system', content: QUICKASK_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(promptData) },
        { role: 'user', content: userQuestion },
      ],
    });

    const answer = response.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('No response from AI');
    }

    console.log(`QuickAsk [${questionKey ?? 'custom'}] (${response.usage?.total_tokens ?? 0} tokens)`);

    res.json({ answer, questionKey: questionKey ?? 'custom' });
  } catch (err) {
    console.error('QuickAsk error:', err);
    res.status(500).json({ error: 'Failed to get answer' });
  }
});

export default router;
