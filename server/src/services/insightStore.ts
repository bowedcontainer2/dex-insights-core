import { getDb } from './database.js';

interface InsightRow {
  id: number;
  generated_date: string;
  alert_text: string;
  recommendation_text: string;
  day_summary_text: string;
  prompt_data: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

export interface StoredInsight {
  generatedDate: string;
  alertText: string;
  recommendationText: string;
  daySummaryText: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

function mapRow(r: InsightRow): StoredInsight {
  return {
    generatedDate: r.generated_date,
    alertText: r.alert_text,
    recommendationText: r.recommendation_text,
    daySummaryText: r.day_summary_text,
    model: r.model,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
  };
}

export function getInsightForDate(date: string): StoredInsight | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM llm_insights WHERE generated_date = ?'
  ).get(date) as InsightRow | undefined;
  return row ? mapRow(row) : null;
}

export function getLatestInsight(): StoredInsight | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM llm_insights ORDER BY generated_date DESC LIMIT 1'
  ).get() as InsightRow | undefined;
  return row ? mapRow(row) : null;
}

export function getInsightsByRange(startDate: string, endDate: string): Array<{
  date: string;
  alert: string;
  recommendation: string;
  daySummary: string;
}> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT generated_date, alert_text, recommendation_text, day_summary_text
    FROM llm_insights
    WHERE generated_date >= ? AND generated_date <= ?
    ORDER BY generated_date DESC
  `).all(startDate, endDate) as Pick<InsightRow, 'generated_date' | 'alert_text' | 'recommendation_text' | 'day_summary_text'>[];

  return rows.map((r) => ({
    date: r.generated_date,
    alert: r.alert_text,
    recommendation: r.recommendation_text,
    daySummary: r.day_summary_text,
  }));
}

export function storeInsight(params: {
  generatedDate: string;
  alertText: string;
  recommendationText: string;
  daySummaryText: string;
  promptData: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO llm_insights
      (generated_date, alert_text, recommendation_text, day_summary_text, prompt_data, model, input_tokens, output_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.generatedDate,
    params.alertText,
    params.recommendationText,
    params.daySummaryText,
    params.promptData,
    params.model,
    params.inputTokens ?? null,
    params.outputTokens ?? null,
  );
}

export function cleanOldInsights(keepDays = 30): void {
  const db = getDb();
  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  db.prepare('DELETE FROM llm_insights WHERE generated_date < ?').run(cutoff);
}
