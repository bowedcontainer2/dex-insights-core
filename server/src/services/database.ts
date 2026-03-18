import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'cgm.db');

let db: Database.Database;

export function initDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value INTEGER NOT NULL,
      trend TEXT NOT NULL,
      trend_rate REAL,
      system_time TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_readings_time ON readings(system_time);

    CREATE TABLE IF NOT EXISTS pattern_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      detected_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      magnitude REAL NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(pattern_type, detected_date, start_time)
    );
    CREATE INDEX IF NOT EXISTS idx_patterns_date ON pattern_events(detected_date);

    CREATE TABLE IF NOT EXISTS llm_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generated_date TEXT NOT NULL UNIQUE,
      alert_text TEXT NOT NULL,
      recommendation_text TEXT NOT NULL,
      day_summary_text TEXT NOT NULL,
      prompt_data TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      reading_count INTEGER NOT NULL,
      mean_glucose REAL NOT NULL,
      std_dev REAL,
      min_glucose INTEGER NOT NULL,
      max_glucose INTEGER NOT NULL,
      time_in_range_pct REAL NOT NULL,
      time_below_pct REAL NOT NULL,
      time_above_pct REAL NOT NULL,
      cv REAL NOT NULL,
      gmi REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add gmi column if missing (for existing databases)
  const columns = db.pragma('table_info(daily_stats)') as { name: string }[];
  if (!columns.some((c) => c.name === 'gmi')) {
    db.exec('ALTER TABLE daily_stats ADD COLUMN gmi REAL');
  }

  console.log('Database initialized at', DB_PATH);
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized — call initDatabase() first');
  return db;
}
