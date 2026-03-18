import type { ReactNode, CSSProperties } from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: ReactNode;
  gridColumn: string;
  gridRow: string;
  style?: CSSProperties;
}

export function Panel({ children, gridColumn, gridRow, style }: PanelProps) {
  return (
    <div className={styles.panel} style={{ gridColumn, gridRow, ...style }}>
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function PanelHeader({ children, style }: PanelHeaderProps) {
  return (
    <div className={styles.header} style={style}>
      {children}
    </div>
  );
}

interface PanelBodyProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function PanelBody({ children, style }: PanelBodyProps) {
  return (
    <div className={styles.body} style={style}>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  children: ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <p>{children}</p>
    </div>
  );
}
