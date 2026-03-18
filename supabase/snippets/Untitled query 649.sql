-- Complete schema for CGMInsights (fresh database)
-- Run in Supabase SQL Editor (Studio → SQL Editor)

-- ══════════════════════════════════════════════════════════════
-- 1. user_profiles — per-user Dexcom credentials & settings
-- ══════════════════════════════════════════════════════════════

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dexcom_username TEXT,
  dexcom_password TEXT,
  dexcom_session_id TEXT,
  dexcom_account_id TEXT,
  dexcom_base_url TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- 2. readings — raw CGM glucose values
-- ══════════════════════════════════════════════════════════════

CREATE TABLE readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  value INTEGER NOT NULL,
  trend TEXT NOT NULL,
  trend_rate DOUBLE PRECISION,
  system_time TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX idx_readings_user_time ON readings(user_id, system_time);

ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_readings" ON readings FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- 3. pattern_events — detected glucose patterns
-- ══════════════════════════════════════════════════════════════

CREATE TABLE pattern_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pattern_type TEXT NOT NULL,
  detected_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  magnitude DOUBLE PRECISION NOT NULL,
  metadata JSONB
);

CREATE UNIQUE INDEX idx_patterns_user_unique ON pattern_events(user_id, pattern_type, detected_date, start_time);

ALTER TABLE pattern_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_patterns" ON pattern_events FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- 4. daily_stats — aggregated daily glucose metrics
-- ══════════════════════════════════════════════════════════════

CREATE TABLE daily_stats (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  reading_count INTEGER NOT NULL,
  mean_glucose DOUBLE PRECISION NOT NULL,
  std_dev DOUBLE PRECISION,
  min_glucose INTEGER NOT NULL,
  max_glucose INTEGER NOT NULL,
  time_in_range_pct DOUBLE PRECISION NOT NULL,
  time_below_pct DOUBLE PRECISION NOT NULL,
  time_above_pct DOUBLE PRECISION NOT NULL,
  cv DOUBLE PRECISION,
  gmi DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_stats" ON daily_stats FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- 5. llm_insights — AI-generated daily insights
-- ══════════════════════════════════════════════════════════════

CREATE TABLE llm_insights (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  generated_date DATE NOT NULL,
  alert_text TEXT NOT NULL,
  recommendation_text TEXT NOT NULL,
  day_summary_text TEXT NOT NULL,
  prompt_data TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER
);

CREATE UNIQUE INDEX idx_insights_user_date ON llm_insights(user_id, generated_date);

ALTER TABLE llm_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_insights" ON llm_insights FOR ALL USING (auth.uid() = user_id);
