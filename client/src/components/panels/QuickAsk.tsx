import { useState, type ReactNode } from 'react';
import { useQuickAsk } from '../../hooks/useQuickAsk';
import type { QuickAskKey } from '../../types/dexcom';
import styles from './QuickAsk.module.css';

const BUTTONS: { key: QuickAskKey; label: string; icon: ReactNode }[] = [
  {
    key: 'last_night',
    label: 'How was last night?',
    icon: (
      <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    key: 'today_so_far',
    label: 'How is my day going?',
    icon: (
      <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: 'spike_normal',
    label: 'Is this spike normal?',
    icon: (
      <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 18 8 10 12 16 16 6 20 14" />
      </svg>
    ),
  },
];

const BUTTON_LABELS: Record<QuickAskKey, string> = {
  last_night: 'How was last night?',
  today_so_far: "How's my day going?",
  tonight_outlook: 'Tonight outlook?',
  spike_normal: 'Is this spike normal?',
};

export default function QuickAsk() {
  const { answer, loading, error, activeQuestion, customQuestion, cooldownRemaining, ask, askCustom, dismiss } = useQuickAsk();
  const [inputValue, setInputValue] = useState('');

  const hasResponse = answer || error || loading;
  const questionDisplay = activeQuestion ? BUTTON_LABELS[activeQuestion] : customQuestion;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;
    askCustom(trimmed);
    setInputValue('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>Ask DayArc</span>
      </div>
      <div className={styles.body}>
        {!hasResponse && (
          <div className={styles.buttonRow}>
            {BUTTONS.map(({ key, label, icon }) => (
              <button
                key={key}
                className={styles.askButton}
                onClick={() => ask(key)}
                disabled={loading}
              >
                {icon}
                {label}
                <span className={styles.buttonDot} />
              </button>
            ))}
          </div>
        )}

        {loading && (
          <>
            <p className={styles.questionLabel}>{questionDisplay}</p>
            <p className={styles.thinking}>Thinking...</p>
          </>
        )}

        {answer && (
          <>
            <p className={styles.questionLabel}>{questionDisplay}</p>
            <p className={styles.answerText}>{answer}</p>
            <div className={styles.dismissRow}>
              <button className={styles.dismissButton} onClick={dismiss}>
                Back
              </button>
              {cooldownRemaining > 0 && (
                <span className={styles.cooldownHint}>{cooldownRemaining}s</span>
              )}
            </div>
          </>
        )}

        {error && !loading && (
          <>
            {questionDisplay && <p className={styles.questionLabel}>{questionDisplay}</p>}
            <p className={styles.errorText}>{error}</p>
            <div className={styles.dismissRow}>
              <button className={styles.dismissButton} onClick={dismiss}>
                Back
              </button>
            </div>
          </>
        )}

        <form className={styles.inputRow} onSubmit={handleSubmit}>
          <span className={styles.inputPrefix}>&gt;</span>
          <input
            className={styles.input}
            type="text"
            placeholder="Ask anything about your glucose data..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!inputValue.trim() || loading}
          >
            <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
