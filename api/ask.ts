import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { requireAuth, AuthError } from '../lib/auth.js';
import { config } from '../lib/config.js';
import { getReadingsByRange } from '../lib/readingStore.js';
import { getPatternEventsByRange, getDailyStatsByRange } from '../lib/patternStore.js';
import type { QuickAskKey } from '../shared/types.js';

const VALID_KEYS: QuickAskKey[] = ['last_night', 'today_so_far', 'tonight_outlook', 'spike_normal'];

const QUESTIONS: Record<QuickAskKey, string> = {
  last_night: 'How was last night? Analyze my overnight glucose patterns, including any lows, highs, or instability while I slept.',
  today_so_far: "How's my day going? Analyze my glucose readings from today so far — any spikes, drops, or trends worth noting.",
  tonight_outlook: 'What should I watch out for tonight? Based on my recent patterns and today\'s data, what can I expect overnight?',
  spike_normal: 'Is my current reading or most recent spike normal for me? Compare it against my historical patterns from the past week.',
};

// How far back to pull readings per question type
const READING_HOURS: Record<QuickAskKey, number> = {
  last_night: 12,       // overnight + some evening context
  today_so_far: 16,     // today + late last night
  tonight_outlook: 24,  // today + last night for pattern context
  spike_normal: 24,     // recent day for comparison
};

// How many days of stats/patterns to include
const CONTEXT_DAYS: Record<QuickAskKey, number> = {
  last_night: 3,
  today_so_far: 3,
  tonight_outlook: 5,
  spike_normal: 7,      // needs full history for "normal" comparison
};

async function buildQuickAskData(userId: string, questionKey: QuickAskKey) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const readingHours = READING_HOURS[questionKey];
  const contextDays = CONTEXT_DAYS[questionKey];

  const readingsStart = new Date(now.getTime() - readingHours * 60 * 60 * 1000).toISOString();
  const statsStart = new Date(now.getTime() - contextDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [readings, dailyStats, patternEvents] = await Promise.all([
    getReadingsByRange(userId, readingsStart, now.toISOString()),
    getDailyStatsByRange(userId, statsStart, today),
    getPatternEventsByRange(userId, statsStart, today),
  ]);

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

const QUICKASK_SYSTEM_PROMPT = `You answer specific questions about a user's CGM glucose data. You have access to their recent readings, daily stats, and detected patterns.

TONE:
- Sound like a knowledgeable friend, not a medical textbook.
- Lead with the headline. No filler, no preamble.
- Use plain time formats: "between 4–9 AM", "after lunch", "overnight". Never ISO timestamps.
- Round numbers. Say "spiked to 215" not "rose to a peak of 214.7 mg/dL around 14:40–14:50".

SAFETY:
- You are NOT a doctor. Never diagnose or prescribe.
- Use casual hedging: "might help", "worth trying", "could be worth a look".
- Skip the "consult your healthcare provider" boilerplate unless discussing medication.

RESPONSE FORMAT:
- Answer in 2-4 sentences of plain conversational text.
- No JSON, no markdown, no bullet points. Just natural language.
- Lead with the direct answer, then add supporting detail.
- Reference specific numbers and times from the data.`;

// Simple in-memory rate limiting: max 20 asks per user per day
const rateLimitMap = new Map<string, number>();

function checkRateLimit(userId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${today}`;
  const count = rateLimitMap.get(key) ?? 0;
  if (count >= 20) return false;
  rateLimitMap.set(key, count + 1);
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await requireAuth(req);

    const { questionKey } = req.body ?? {};
    if (!questionKey || !VALID_KEYS.includes(questionKey)) {
      return res.status(400).json({ error: 'Invalid questionKey' });
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Daily question limit reached. Try again tomorrow.' });
    }

    const promptData = await buildQuickAskData(userId, questionKey as QuickAskKey);

    if (promptData.readings.length === 0) {
      return res.json({
        answer: 'No glucose data available yet. Connect your Dexcom and check back once readings start flowing in.',
        questionKey,
      });
    }

    const client = new OpenAI({ apiKey: config.openai.apiKey });

    const response = await client.chat.completions.create({
      model: config.openai.model,
      max_completion_tokens: 4096,
      messages: [
        { role: 'system', content: QUICKASK_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(promptData) },
        { role: 'user', content: QUESTIONS[questionKey as QuickAskKey] },
      ],
    });

    console.log('QuickAsk OpenAI response:', JSON.stringify({
      finishReason: response.choices[0]?.finish_reason,
      hasContent: !!response.choices[0]?.message?.content,
      contentLength: response.choices[0]?.message?.content?.length,
      refusal: response.choices[0]?.message?.refusal,
      usage: response.usage,
    }));

    const answer = response.choices[0]?.message?.content;
    if (!answer) {
      throw new Error(`No response from AI (finish_reason: ${response.choices[0]?.finish_reason}, refusal: ${response.choices[0]?.message?.refusal})`);
    }

    console.log(`QuickAsk [${questionKey}] (${response.usage?.total_tokens ?? 0} tokens)`);

    res.json({ answer, questionKey });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('QuickAsk error:', err?.message ?? err, err?.status, err?.code);
    res.status(500).json({ error: 'Failed to get answer', detail: err?.message ?? String(err) });
  }
}
