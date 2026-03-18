import type { PatternSummary, PatternType, InsightsResponse } from '../../types/dexcom';
import { Panel, PanelHeader, PanelBody } from '../Panel';
import styles from './ActionableInsight.module.css';

const RECOMMENDATIONS: Record<PatternType, string> = {
  morning_spike:
    'Consider a small protein-rich snack before bed or adjusting morning basal timing to reduce dawn phenomenon spikes.',
  rapid_rise:
    'Try pairing carbohydrates with protein or fat to slow absorption and reduce post-meal glucose spikes.',
  rapid_drop:
    'Monitor for potential lows after rapid drops. Consider reducing activity intensity or adding a pre-activity snack.',
  prolonged_high:
    'Review meal composition and timing. Prolonged highs may indicate a need to adjust carb portions or post-meal activity.',
  prolonged_low:
    'Consider consuming 15g of fast-acting carbohydrates when glucose drops below 70. Review timing of meals and activity.',
  nocturnal_low:
    'Consider a bedtime snack with slow-digesting carbs and protein. Avoid intense evening exercise and review evening meal timing with your provider.',
  high_variability:
    'Focus on consistent meal timing and balanced macronutrients. High variability often improves with regular meal spacing and pairing carbs with protein or fat.',
  elevated_overnight:
    'Try finishing your last meal 3+ hours before bed and reducing evening carbohydrate portions. A post-dinner walk may also help lower overnight glucose.',
  post_meal_crash:
    'The spike-then-crash pattern suggests an exaggerated insulin response. Try reducing simple carbs in favor of complex carbs with protein and fat to smooth the curve.',
};

interface Props {
  patterns: PatternSummary[];
  insight?: InsightsResponse | null;
}

export default function ActionableInsight({ patterns, insight }: Props) {
  const useLlm = insight?.source === 'llm' && insight.recommendation;

  const top = patterns.length > 0
    ? [...patterns].sort((a, b) => b.conviction - a.conviction)[0]
    : null;

  const text = useLlm
    ? insight!.recommendation
    : top
      ? RECOMMENDATIONS[top.type]
      : 'Continue monitoring \u2014 actionable insights will appear as patterns are detected over multiple days.';

  return (
    <Panel gridColumn="span 4" gridRow="span 1">
      <PanelHeader>Actionable Insight</PanelHeader>
      <PanelBody style={{ justifyContent: 'center' }}>
        <p className={styles.text}>{text}</p>
      </PanelBody>
    </Panel>
  );
}
