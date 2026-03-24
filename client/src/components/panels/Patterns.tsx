import type { PatternSummary, PatternType } from '../../types/dexcom';
import { Panel, PanelHeader, PanelBody, EmptyState } from '../Panel';
import styles from './Patterns.module.css';

const PATTERN_LABELS: Record<PatternType, string> = {
  morning_spike: 'Morning Spike',
  rapid_rise: 'Rapid Rise',
  rapid_drop: 'Rapid Drop',
  prolonged_high: 'Prolonged High',
  prolonged_low: 'Prolonged Low',
  nocturnal_low: 'Overnight Low',
  high_variability: 'High Variability',
  elevated_overnight: 'Elevated Overnight',
  post_meal_crash: 'Post-Meal Crash',
};

const ICON_PATHS: Record<PatternType, string> = {
  morning_spike: 'M 0,24 L 12,0 L 24,24 Z',
  rapid_rise: 'M 0,24 L 12,0 L 24,24 Z',
  rapid_drop: 'M 0,0 L 12,22 L 24,0 Z',
  prolonged_high: 'M 12,2 L 15,9 L 22,9 L 17,14 L 19,21 L 12,17 L 5,21 L 7,14 L 2,9 L 9,9 Z',
  prolonged_low: 'M 0,0 L 12,22 L 24,0 Z',
  nocturnal_low: 'M 2,12 Q 12,0 22,12 Q 12,24 2,12 Z',
  high_variability: 'M 0,12 L 4,4 L 8,20 L 12,4 L 16,20 L 20,4 L 24,12',
  elevated_overnight: 'M 0,20 L 4,8 Q 12,2 20,8 L 24,20 Z',
  post_meal_crash: 'M 0,16 L 8,4 L 16,20 L 24,16',
};

const MAGNITUDE_UNITS: Record<PatternType, string> = {
  morning_spike: 'mg/dL',
  rapid_rise: 'mg/dL',
  rapid_drop: 'mg/dL',
  prolonged_high: 'min',
  prolonged_low: 'min',
  nocturnal_low: 'min',
  high_variability: 'CV',
  elevated_overnight: 'mg/dL',
  post_meal_crash: 'mg/dL',
};

function formatMagnitude(p: PatternSummary): { value: string; unit: string } {
  const mag = Math.round(p.latestEvent?.magnitude ?? 0);
  const unit = MAGNITUDE_UNITS[p.type];
  switch (p.type) {
    case 'morning_spike':
    case 'rapid_rise':
      return { value: `+${mag}`, unit };
    case 'rapid_drop':
    case 'post_meal_crash':
      return { value: `-${mag}`, unit };
    case 'prolonged_high':
    case 'prolonged_low':
    case 'nocturnal_low':
      return { value: `${mag}`, unit };
    case 'high_variability':
      return { value: `${mag}%`, unit };
    case 'elevated_overnight':
      return { value: `${mag}`, unit };
  }
}

function formatContext(p: PatternSummary): string {
  if (p.avgMagnitude == null || isNaN(p.avgMagnitude)) return '';
  const avg = Math.round(p.avgMagnitude);
  const latest = Math.round(p.latestEvent?.magnitude ?? 0);
  const unit = MAGNITUDE_UNITS[p.type];
  const sign = ['morning_spike', 'rapid_rise'].includes(p.type) ? '+' : ['rapid_drop', 'post_meal_crash'].includes(p.type) ? '-' : '';
  return `avg ${sign}${avg} ${unit}, latest ${sign}${latest} ${unit}`;
}

function formatRecency(p: PatternSummary): string {
  if (!p.latestEvent) return '';
  const eventDate = p.latestEvent.detectedDate;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (eventDate === today) return 'Today';
  if (eventDate === yesterday) return 'Yesterday';
  const daysAgo = Math.round((Date.now() - new Date(eventDate).getTime()) / 86400000);
  return `${daysAgo}d ago`;
}

function formatLastTime(p: PatternSummary): string {
  if (!p.latestEvent?.startTime) return '';
  try {
    const d = new Date(p.latestEvent.startTime);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

interface Props {
  patterns: PatternSummary[];
  daysWithData: number;
}

export default function Patterns({ patterns, daysWithData }: Props) {
  return (
    <Panel gridColumn="span 4" gridRow="span 2">
      <PanelHeader>Identified Patterns</PanelHeader>
      <PanelBody>
        {daysWithData < 1 ? (
          <EmptyState>Collecting data... Patterns will appear after readings are stored.</EmptyState>
        ) : patterns.length === 0 ? (
          <EmptyState>
            {daysWithData < 2
              ? `${daysWithData} day recorded — patterns require at least 2 days of data to identify trends.`
              : 'Your glucose patterns are looking stable — no significant patterns detected.'}
          </EmptyState>
        ) : (
          <ul className={styles.list}>
            {patterns.map((p, i) => {
              const mag = formatMagnitude(p);
              const recency = formatRecency(p);
              const lastTime = formatLastTime(p);
              const context = formatContext(p);
              return (
                <li
                  key={p.type}
                  className={`${styles.item} ${i < patterns.length - 1 ? styles.itemBorder : ''}`}
                >
                  <svg className={styles.icon} viewBox="0 0 24 24">
                    <path d={ICON_PATHS[p.type]} />
                  </svg>
                  <div className={styles.info}>
                    <div className={styles.labelRow}>
                      <span className={styles.label}>{PATTERN_LABELS[p.type]}</span>
                      <span className={styles[`severity_${p.severity}`]} />
                      {p.todayDetected && <span className={styles.todayBadge}>today</span>}
                    </div>
                    <div className={styles.detail}>
                      {p.occurrences} of {p.daysWithData} days
                      {lastTime && ` · last ${recency} ${lastTime}`}
                    </div>
                    <div className={styles.context}>{context}</div>
                    <div className={styles.dots}>
                      {Array.from({ length: Math.min(p.daysWithData, 7) }, (_, idx) => (
                        <span
                          key={idx}
                          className={idx < p.occurrences ? styles.dotFilled : styles.dotEmpty}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.mag}>
                    <div className={styles.value}>{mag.value}</div>
                    <div className={styles.unit}>{mag.unit}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
