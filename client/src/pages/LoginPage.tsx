import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Footer from '../components/layout/Footer';
import CurrentGlucose from '../components/panels/CurrentGlucose';
import Chart24Hr from '../components/panels/Chart24Hr';
import AIAlert from '../components/panels/AIAlert';
import { getMockEGVs, getMockCurrentReading } from '../mocks/egvData';
import { classifyRange } from '../utils/glucose';
import type { InsightsResponse } from '../types/dexcom';
import styles from './LoginPage.module.css';

function PreviewDashboard() {
  const egvs = useMemo(() => getMockEGVs(), []);
  const currentEgv = useMemo(() => getMockCurrentReading(), []);
  const reading = useMemo(() => ({
    value: currentEgv.value,
    trend: currentEgv.trend,
    trendRate: currentEgv.trendRate,
    timestamp: currentEgv.systemTime,
    range: classifyRange(currentEgv.value),
  }), [currentEgv]);

  const mockInsight: InsightsResponse = {
    alert: 'Heads up \u2014 your mornings have been running hot. You\u2019ve spiked 50+ mg/dL between 4\u20139 AM for 5 days straight, hitting 215 yesterday. A small bedtime snack with protein might help smooth things out.',
    recommendation: '',
    daySummary: '',
    source: 'llm',
    generatedDate: new Date().toISOString().slice(0, 10),
  };

  return (
    <div className={styles.previewWrapper}>
      <div className={styles.previewScale}>
        <div className={styles.previewGrid}>
          <div className={styles.previewGlucose}>
            <CurrentGlucose reading={reading} stale={false} loading={false} />
          </div>
          <div className={styles.previewInsight}>
            <AIAlert patterns={[]} insight={mockInsight} />
          </div>
          <div className={styles.previewChart}>
            <Chart24Hr egvs={egvs} loading={false} hours={24} onHoursChange={() => {}} todayStats={null} />
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <div className={styles.formSide}>
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
        <Footer />
      </div>

      <div className={styles.previewSide}>
        <PreviewDashboard />
        <p className={styles.previewCaption}>Real-time glucose monitoring with AI-powered pattern detection</p>
      </div>
    </div>
  );
}
