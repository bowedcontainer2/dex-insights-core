import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGlucoseData } from '../hooks/useGlucoseData';
import { useCurrentReading } from '../hooks/useCurrentReading';
import { usePatterns } from '../hooks/usePatterns';
import { useInsights } from '../hooks/useInsights';
import { connectDexcom } from '../services/api';
import { Navigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Dashboard from '../components/layout/Dashboard';
import CurrentGlucose from '../components/panels/CurrentGlucose';
import AIAlert from '../components/panels/AIAlert';
import Chart24Hr from '../components/panels/Chart24Hr';
import Patterns from '../components/panels/Patterns';
import ActionableInsight from '../components/panels/ActionableInsight';
import DaySummary from '../components/panels/DaySummary';
import Button from '../components/Button';
import Footer from '../components/layout/Footer';
import styles from './DashboardPage.module.css';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

function DexcomConnectCard({ onConnected }: { onConnected: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await connectDexcom(username, password);
      onConnected();
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Dexcom');
    } finally {
      setSubmitting(false);
    }
  };

  const formValid = username.trim() !== '' && password.trim() !== '';

  return (
    <div className={styles.connectCard}>
      <h2 className={styles.connectTitle}>Connect Your Dexcom</h2>
      <p className={styles.connectSubtitle}>
        Enter your Dexcom Share credentials to start monitoring
      </p>
      {error && <p className={styles.connectError}>{error}</p>}
      <form className={styles.connectForm} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="dexcom-username">DEXCOM USERNAME</label>
          <input
            id="dexcom-username"
            className={styles.input}
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="dexcom@example.com"
            autoComplete="username"
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="dexcom-password">DEXCOM PASSWORD</label>
          <input
            id="dexcom-password"
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <Button
          variant="solid"
          type="submit"
          disabled={!formValid || submitting}
          style={{ fontSize: '1rem', padding: '0.75rem 2rem', width: '100%' }}
        >
          {submitting ? 'CONNECTING...' : 'CONNECT DEXCOM'}
        </Button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const { authenticated, signOut, dexcomConnected, dexcomLoading, refreshDexcomStatus, user } = useAuth();
  const [chartHours, setChartHours] = useState(24);
  const { egvs, loading: dataLoading } = useGlucoseData(24);
  const { reading, stale } = useCurrentReading();
  const { data: patternsData } = usePatterns();
  const { data: insightsData } = useInsights();

  if (!USE_MOCK && !authenticated) return <Navigate to="/login" replace />;

  // Show Dexcom connect card if not connected
  if (!USE_MOCK && !dexcomLoading && !dexcomConnected) {
    return (
      <div className={styles.page}>
        <Header onLogout={signOut} userEmail={user?.email} />
        <DexcomConnectCard onConnected={refreshDexcomStatus} />
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header onLogout={signOut} userEmail={user?.email} />
      <Dashboard>
        <CurrentGlucose reading={reading} stale={stale} loading={dataLoading} />
        <AIAlert patterns={patternsData?.patterns ?? []} insight={insightsData} />
        <Chart24Hr egvs={egvs} loading={dataLoading} hours={chartHours} onHoursChange={setChartHours} todayStats={patternsData?.todayStats ?? null} />
        <ActionableInsight patterns={patternsData?.patterns ?? []} insight={insightsData} />
        <Patterns patterns={patternsData?.patterns ?? []} daysWithData={patternsData?.windowStats?.length ?? 0} />
        <DaySummary insight={insightsData} />
      </Dashboard>
      <Footer />
    </div>
  );
}
