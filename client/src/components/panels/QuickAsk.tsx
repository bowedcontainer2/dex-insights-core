import { Panel, PanelHeader, PanelBody } from '../Panel';
import Button from '../Button';
import { useQuickAsk } from '../../hooks/useQuickAsk';
import type { QuickAskKey } from '../../types/dexcom';
import styles from './QuickAsk.module.css';

const BUTTON_LABELS: Record<QuickAskKey, string> = {
  last_night: 'How was last night?',
  today_so_far: "How's my day going?",
  tonight_outlook: 'Tonight outlook?',
  spike_normal: 'Is this spike normal?',
};

export default function QuickAsk() {
  const { answer, loading, error, activeQuestion, cooldownRemaining, ask, dismiss } = useQuickAsk();

  const showButtons = !loading && !answer && !error;
  const hasResponse = answer || error;

  return (
    <Panel gridColumn="1 / -1" gridRow="span 1">
      <PanelHeader>Quick Ask</PanelHeader>
      <PanelBody>
        {showButtons && (
          <div className={styles.buttonGrid}>
            {(Object.keys(BUTTON_LABELS) as QuickAskKey[]).map((key) => (
              <button
                key={key}
                className={styles.askButton}
                onClick={() => ask(key)}
                disabled={cooldownRemaining > 0}
              >
                {BUTTON_LABELS[key]}
                {cooldownRemaining > 0 && ` (${cooldownRemaining}s)`}
              </button>
            ))}
          </div>
        )}

        {loading && activeQuestion && (
          <>
            <p className={styles.questionLabel}>{BUTTON_LABELS[activeQuestion]}</p>
            <p className={styles.thinking}>Thinking...</p>
          </>
        )}

        {answer && activeQuestion && (
          <>
            <p className={styles.questionLabel}>{BUTTON_LABELS[activeQuestion]}</p>
            <p className={styles.answerText}>{answer}</p>
            <div className={styles.dismissRow}>
              <Button onClick={dismiss} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                Ask Another
              </Button>
              {cooldownRemaining > 0 && (
                <span className={styles.cooldownHint}>{cooldownRemaining}s</span>
              )}
            </div>
          </>
        )}

        {error && !loading && (
          <>
            {activeQuestion && <p className={styles.questionLabel}>{BUTTON_LABELS[activeQuestion]}</p>}
            <p className={styles.errorText}>{error}</p>
            <div className={styles.dismissRow}>
              <Button onClick={dismiss} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                Try Again
              </Button>
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
