import OpenAI from 'openai';
import { config } from '../config.js';
import { getReadingsByRange } from './readingStore.js';
import { getPatternEventsByRange, getDailyStatsByRange } from './patternStore.js';
import { getInsightForDate, getInsightsByRange, storeInsight } from './insightStore.js';
import type { PatternType, PatternSummary } from '../../../shared/types.js';

const SYSTEM_PROMPT = `You analyze CGM data for a personal glucose dashboard. Write like a sharp, friendly coach — not a clinician. Be brief, direct, and conversational.

TONE:
- Sound like a knowledgeable friend, not a medical textbook.
- Lead with the headline. No filler, no preamble.
- Use plain time formats: "between 4–9 AM", "after lunch", "overnight". Never ISO timestamps.
- Round numbers. Say "spiked to 215" not "rose to a peak of 214.7 mg/dL around 14:40–14:50".
- One key insight per field. Don't cram multiple observations together.
- Keep it scannable — someone should get the point in 3 seconds.

SAFETY:
- You are NOT a doctor. Never diagnose or prescribe.
- Use casual hedging: "might help", "worth trying", "could be worth a look".
- Skip the "consult your healthcare provider" boilerplate unless discussing medication.

CONTEXT:
- You receive 7 days of readings, daily stats, detected patterns, and your own previous insights.
- Use previous insights to avoid repeating yourself and to track whether advice had visible effects.
- Reference specific numbers and times, but keep it concise.

Return ONLY a JSON object with these fields:

- "alert": The single most important thing to know right now. 1-2 sentences max. Lead with what's happening, include a key number and time window. Example: "Heads up — your mornings have been running hot. You've spiked 50+ mg/dL between 4–9 AM for 5 days straight, hitting 215 yesterday."

- "recommendation": One concrete, actionable thing to try today. 1-2 sentences. Be specific: what to do, when to do it. Example: "A small bedtime snack with protein might help smooth things out." Do NOT restate the alert.

- "daySummary": A casual 1-sentence take on yesterday. Example: "Solid day — 82% in range with stable nights and one post-lunch spike to 195."

No markdown, no code blocks — just the JSON object.`;

const ALL_PATTERN_TYPES: PatternType[] = [
  'morning_spike', 'rapid_rise', 'rapid_drop', 'prolonged_high', 'prolonged_low',
  'nocturnal_low', 'high_variability', 'elevated_overnight', 'post_meal_crash',
];

function buildPatternSummaries(
  events: ReturnType<typeof getPatternEventsByRange>,
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

export function buildPromptData() {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const readings = getReadingsByRange(sevenDaysAgo, today + 'T23:59:59');
  const dailyStats = getDailyStatsByRange(sevenDaysAgo, today);
  const patternEvents = getPatternEventsByRange(sevenDaysAgo, today);
  const patternSummaries = buildPatternSummaries(patternEvents, dailyStats.length, today);

  const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const previousInsights = getInsightsByRange(eightDaysAgo, yesterday);

  const compactReadings = readings.map((r) => ({
    v: r.value,
    t: r.trend,
    r: r.trend_rate,
    ts: r.system_time,
  }));

  return {
    currentTime: new Date().toISOString(),
    timezone: config.timezone,
    readings: compactReadings,
    dailyStats,
    patternEvents,
    patternSummaries,
    previousInsights,
  };
}

export async function generateInsights(): Promise<void> {
  if (!config.openai.apiKey) return;

  const today = new Date().toISOString().slice(0, 10);

  const existing = getInsightForDate(today);
  if (existing) return;

  const promptData = buildPromptData();

  if (promptData.readings.length === 0) return;

  const client = new OpenAI({ apiKey: config.openai.apiKey });
  const userMessage = JSON.stringify(promptData);

  const response = await client.chat.completions.create({
    model: config.openai.model,
    max_completion_tokens: config.openai.maxTokens,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('No text response from OpenAI');
  }

  const parsed = JSON.parse(text);
  if (!parsed.alert || !parsed.recommendation || !parsed.daySummary) {
    throw new Error('Invalid response structure from OpenAI');
  }

  storeInsight({
    generatedDate: today,
    alertText: parsed.alert,
    recommendationText: parsed.recommendation,
    daySummaryText: parsed.daySummary,
    promptData: userMessage,
    model: config.openai.model,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
  });

  const totalTokens = response.usage?.total_tokens ?? 0;
  console.log(`Generated LLM insight (${totalTokens} tokens)`);
}
