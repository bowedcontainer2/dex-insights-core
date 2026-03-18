import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { authenticated, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (loading) return null;
  if (authenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formValid = email.trim() !== '' && password.trim() !== '';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>DEX_INSIGHTS_CORE</h1>
      <p className={styles.subtitle}>
        {mode === 'signin'
          ? 'Sign in to your account'
          : 'Create your account to begin monitoring'}
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="email">EMAIL</label>
          <input
            id="email"
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="password">PASSWORD</label>
          <input
            id="password"
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
          />
        </div>
        <Button
          variant="solid"
          type="submit"
          disabled={!formValid || submitting}
          style={{ fontSize: '1rem', padding: '0.75rem 2rem', width: '100%' }}
        >
          {submitting
            ? (mode === 'signin' ? 'SIGNING IN...' : 'CREATING ACCOUNT...')
            : (mode === 'signin' ? 'SIGN IN' : 'SIGN UP')}
        </Button>
      </form>
      <p className={styles.toggle}>
        {mode === 'signin' ? (
          <>
            Don't have an account?{' '}
            <button className={styles.toggleBtn} onClick={() => { setMode('signup'); setError(''); }}>
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button className={styles.toggleBtn} onClick={() => { setMode('signin'); setError(''); }}>
              Sign In
            </button>
          </>
        )}
      </p>
      <p className={styles.legal}>
        By continuing, you agree to our{' '}
        <Link to="/terms">Terms of Service</Link> and{' '}
        <Link to="/privacy">Privacy Policy</Link>
      </p>
    </div>
  );
}
