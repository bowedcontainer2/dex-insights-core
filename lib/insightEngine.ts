import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { getReadingsByRange } from './readingStore.js';
import { getPatternEventsByRange, getDailyStatsByRange } from './patternStore.js';
import { getInsightForDate, getInsightsByRange, storeInsight } from './insightStore.js';
import type { PatternType, PatternSummary } from '../shared/types.js';

const SYSTEM_PROMPT = `You are a glucose data analyst for a personal CGM dashboard. You have 7 days of continuous glucose monitor data including raw 5-minute readings, daily statistics, and detected patterns. Analyze this data to provide a daily briefing.

GUIDELINES:
- You are NOT a doctor. Never diagnose conditions or prescribe treatments.
- Use phrases like "you may want to consider", "this pattern could suggest", "many people find that".
- Always recommend consulting a healthcare provider for medical decisions.
- Be specific: reference actual numbers, times, and patterns from the data.
- Be encouraging: acknowledge positive trends alongside areas for attention.
- Look for multi-day trends (improving/worsening TIR, recurring time-of-day patterns, consistency of glucose variability).
- You will receive your own previous insights from recent days. Use them to: track whether your past recommendations had visible effects, avoid repeating the same language, and build on ongoing observations.

Return ONLY a JSON object with exactly these fields:

- "alert": The most significant pattern or finding from the data. This is a clinical-style observation: what is happening, when, how severe, and how it compares to recent days. 2-4 sentences. Reference specific numbers, times, and days. This powers a prominent alert banner on the dashboard.

- "recommendation": A separate, actionable suggestion the user can act on today. This is NOT a restatement of the alert — it's practical advice: what to eat, when to move, what to adjust timing. 2-3 sentences. This powers a smaller "Actionable Insight" card.

- "daySummary": A 1-2 sentence plain-language summary of yesterday's glucose profile (e.g., "Yesterday was a solid day — 82% in range with stable overnight readings and one brief post-lunch spike to 195.").

No markdown, no code blocks — just the JSON object.`;

const ALL_PATTERN_TYPES: PatternType[] = [
  'morning_spike', 'rapid_rise', 'rapid_drop', 'prolonged_high', 'prolonged_low',
  'nocturnal_low', 'high_variability', 'elevated_overnight', 'post_meal_crash',
];

function buildPatternSummaries(
  events: Awaited<ReturnType<typeof getPatternEventsByRange>>,
  daysWithData: number,
  today: string
): PatternSummary[] {
  return ALL_PATTERN_TYPES
    .map((type): PatternSummary => {
      const typeEvents = events.filter((e) => e.patternType === type);
      const uniqueDates = new Set(typeEvents.map((e) => e.detectedDate));
      const occurrences = uniqueDates.size;
      const conviction = daysWithData > 0 ? occurrences / daysWithData : 0;
      const todayDetected = uniqueDates.has(today);
      const latestEvent = typeEvents[0];
      return { type, conviction, occurrences, windowDays: 7, daysWithData, todayDetected, latestEvent };
    })
    .filter((s) => s.occurrences >= 1);
}

export async function buildPromptData(userId: string, timezone: string) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const readings = await getReadingsByRange(userId, sevenDaysAgo, today + 'T23:59:59');
  const dailyStats = await getDailyStatsByRange(userId, sevenDaysAgo, today);
  const patternEvents = await getPatternEventsByRange(userId, sevenDaysAgo, today);
  const patternSummaries = buildPatternSummaries(patternEvents, dailyStats.length, today);

  const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const previousInsights = await getInsightsByRange(userId, eightDaysAgo, yesterday);

  const compactReadings = readings.map((r) => ({
    v: r.value,
    t: r.trend,
    r: r.trend_rate,
    ts: r.system_time,
  }));

  return {
    currentTime: new Date().toISOString(),
    timezone,
    readings: compactReadings,
    dailyStats,
    patternEvents,
    patternSummaries,
    previousInsights,
  };
}

export async function generateInsights(userId: string, timezone: string): Promise<void> {
  if (!config.anthropic.apiKey) return;

  const today = new Date().toISOString().slice(0, 10);

  const existing = await getInsightForDate(userId, today);
  if (existing) return;

  const promptData = await buildPromptData(userId, timezone);

  if (promptData.readings.length === 0) return;

  const client = new Anthropic({ apiKey: config.anthropic.apiKey });
  const userMessage = JSON.stringify(promptData);

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: config.anthropic.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = JSON.parse(textBlock.text);
  if (!parsed.alert || !parsed.recommendation || !parsed.daySummary) {
    throw new Error('Invalid response structure from Claude');
  }

  await storeInsight(userId, {
    generatedDate: today,
    alertText: parsed.alert,
    recommendationText: parsed.recommendation,
    daySummaryText: parsed.daySummary,
    promptData: userMessage,
    model: config.anthropic.model,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  });

  const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
  console.log(`Generated LLM insight (${totalTokens} tokens)`);
}
