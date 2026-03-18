import { supabase } from './supabase.js';

export interface StoredInsight {
  generatedDate: string;
  alertText: string;
  recommendationText: string;
  daySummaryText: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface InsightRow {
  generated_date: string;
  alert_text: string;
  recommendation_text: string;
  day_summary_text: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
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

export async function getInsightForDate(userId: string, date: string): Promise<StoredInsight | null> {
  const { data, error } = await supabase
    .from('llm_insights')
    .select('generated_date, alert_text, recommendation_text, day_summary_text, model, input_tokens, output_tokens')
    .eq('user_id', userId)
    .eq('generated_date', date)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as InsightRow) : null;
}

export async function getLatestInsight(userId: string): Promise<StoredInsight | null> {
  const { data, error } = await supabase
    .from('llm_insights')
    .select('generated_date, alert_text, recommendation_text, day_summary_text, model, input_tokens, output_tokens')
    .eq('user_id', userId)
    .order('generated_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as InsightRow) : null;
}

export async function getInsightsByRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; alert: string; recommendation: string; daySummary: string }>> {
  const { data, error } = await supabase
    .from('llm_insights')
    .select('generated_date, alert_text, recommendation_text, day_summary_text')
    .eq('user_id', userId)
    .gte('generated_date', startDate)
    .lte('generated_date', endDate)
    .order('generated_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    date: r.generated_date,
    alert: r.alert_text,
    recommendation: r.recommendation_text,
    daySummary: r.day_summary_text,
  }));
}

export async function storeInsight(userId: string, params: {
  generatedDate: string;
  alertText: string;
  recommendationText: string;
  daySummaryText: string;
  promptData: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  const { error } = await supabase
    .from('llm_insights')
    .upsert({
      user_id: userId,
      generated_date: params.generatedDate,
      alert_text: params.alertText,
      recommendation_text: params.recommendationText,
      day_summary_text: params.daySummaryText,
      prompt_data: params.promptData,
      model: params.model,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
    }, { onConflict: 'user_id,generated_date' });

  if (error) throw error;
}
