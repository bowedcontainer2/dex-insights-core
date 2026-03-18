import Button from '../Button';
import styles from './Header.module.css';

interface HeaderProps {
  onLogout: () => void;
  userEmail?: string;
}

export default function Header({ onLogout, userEmail }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>DEX_INSIGHTS_CORE</h1>
      <div className={styles.controls}>
        <div className={styles.meta}>
          {userEmail && <span>{userEmail}</span>}
          <span>SYS.OP. NORMAL</span>
          <span>DATA SYNC: LIVE</span>
        </div>
        <Button onClick={onLogout} style={{ fontSize: '0.875rem' }}>Logout</Button>
      </div>
    </header>
  );
}
