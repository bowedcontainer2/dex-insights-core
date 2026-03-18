import type { CSSProperties, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'outline' | 'solid' | 'inverted';
  style?: CSSProperties;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({ children, onClick, disabled, variant = 'outline', style, type }: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      type={type}
    >
      {children}
    </button>
  );
}
