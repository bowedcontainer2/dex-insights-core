import type { PatternSummary, PatternType, InsightsResponse } from '../../types/dexcom';
import Button from '../Button';
import styles from './AIAlert.module.css';

const PATTERN_TITLES: Record<PatternType, string> = {
  morning_spike: 'Morning Spike Detected',
  rapid_rise: 'Rapid Glucose Rise',
  rapid_drop: 'Rapid Glucose Drop',
  prolonged_high: 'Prolonged High Glucose',
  prolonged_low: 'Prolonged Low Glucose',
  nocturnal_low: 'Overnight Low Detected',
  high_variability: 'High Glucose Variability',
  elevated_overnight: 'Elevated Overnight Glucose',
  post_meal_crash: 'Post-Meal Crash Detected',
};

function generateDescription(p: PatternSummary): string {
  const mag = Math.round(p.latestEvent?.magnitude ?? 0);
  switch (p.type) {
    case 'morning_spike':
      return `Dawn phenomenon pattern: glucose rises ~${mag} mg/dL between 04:00\u201309:30. Detected on ${p.occurrences} of the last ${p.daysWithData} days (${Math.round(p.conviction * 100)}% conviction).`;
    case 'rapid_rise':
      return `Post-meal spike of ${mag} mg/dL within 30 minutes. This pattern has occurred on ${p.occurrences} of the last ${p.daysWithData} days.`;
    case 'rapid_drop':
      return `Rapid glucose decline of ${mag} mg/dL within 30 minutes. Seen on ${p.occurrences} of the last ${p.daysWithData} days. Monitor for potential low.`;
    case 'prolonged_high':
      return `Glucose remained above 180 mg/dL for ${mag} minutes. This pattern has occurred on ${p.occurrences} of the last ${p.daysWithData} days.`;
    case 'prolonged_low':
      return `Glucose remained below 70 mg/dL for ${mag} minutes. This pattern has occurred on ${p.occurrences} of the last ${p.daysWithData} days. Consider reviewing carb timing.`;
    case 'nocturnal_low':
      return `Overnight glucose dropped below 70 mg/dL for ${mag} minutes while sleeping. Detected on ${p.occurrences} of the last ${p.daysWithData} nights. Nocturnal lows are especially concerning as they go unnoticed.`;
    case 'high_variability':
      return `Glucose variability is elevated with a coefficient of variation of ${mag}% (above the 36% stability threshold). Seen on ${p.occurrences} of the last ${p.daysWithData} days.`;
    case 'elevated_overnight':
      return `Average overnight glucose was ${mag} mg/dL (above 120 mg/dL target). Detected on ${p.occurrences} of the last ${p.daysWithData} nights. This may relate to late-night eating or meal composition.`;
    case 'post_meal_crash':
      return `Glucose spiked then crashed ${mag} mg/dL below baseline within 3 hours — a reactive hypoglycemia pattern. Detected on ${p.occurrences} of the last ${p.daysWithData} days.`;
  }
}

interface Props {
  patterns: PatternSummary[];
  insight?: InsightsResponse | null;
  onAskAbout?: (text: string) => void;
}

export default function AIAlert({ patterns, insight, onAskAbout }: Props) {
  const useLlm = insight?.source === 'llm' && insight.alert;

  const todayPatterns = patterns.filter((p) => p.todayDetected);
  const topPattern = todayPatterns.length > 0
    ? todayPatterns.sort((a, b) => b.conviction - a.conviction)[0]
    : patterns.sort((a, b) => b.conviction - a.conviction)[0] ?? null;

  const title = useLlm ? 'Today\'s Read' : (topPattern ? PATTERN_TITLES[topPattern.type] : 'No Alerts');
  const subtitle = useLlm ? null : (topPattern ? 'Pattern Alert' : 'AI Predictive Model');
  const body = useLlm
    ? insight!.alert
    : topPattern
      ? generateDescription(topPattern)
      : 'No recurring patterns have been detected yet. Continue wearing your CGM to build up pattern history.';

  return (
    <div className={styles.container}>
      <div className={styles.iconArea}>
        <svg className={styles.iconSvg} viewBox="0 0 100 100">
          <path d="M50 0 Q50 45 100 50 Q50 55 50 100 Q50 55 0 50 Q50 45 50 0 Z" />
        </svg>
      </div>
      <div className={styles.content}>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        <div className={styles.title}>{title}</div>
        <p className={styles.description}>{body}</p>
        {onAskAbout && (
          <div className={styles.actions}>
            <Button variant="inverted" onClick={() => onAskAbout(`Tell me more about this: ${body}. What's causing it and what can I do?`)}>
              Ask About This
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
