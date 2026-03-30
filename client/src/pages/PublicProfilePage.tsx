import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicProfile } from '../services/api';
import type { PublicDashboardData, GlucoseReading, DexcomEGV } from '../types/dexcom';
import Dashboard from '../components/layout/Dashboard';
import CurrentGlucose from '../components/panels/CurrentGlucose';
import AIAlert from '../components/panels/AIAlert';
import Chart24Hr from '../components/panels/Chart24Hr';
import Patterns from '../components/panels/Patterns';
import ActionableInsight from '../components/panels/ActionableInsight';
import DaySummary from '../components/panels/DaySummary';
import QuickAsk from '../components/panels/QuickAsk';
import { useQuickAsk } from '../hooks/useQuickAsk';
import Footer from '../components/layout/Footer';
import styles from './PublicProfilePage.module.css';

function toGlucoseReading(egv: DexcomEGV): GlucoseReading {
  const v = egv.value;
  const range = v < 54 ? 'urgent_low' : v < 70 ? 'low' : v <= 180 ? 'in_range' : v <= 250 ? 'high' : 'urgent_high';
  return {
    value: v,
    trend: egv.trend,
    trendRate: egv.trendRate,
    timestamp: egv.systemTime,
    range,
  };
}

function staleness(egv: DexcomEGV | null): { stale: boolean; label: string } {
  if (!egv) return { stale: true, label: '' };
  const diffMs = Date.now() - new Date(egv.systemTime).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 6) return { stale: false, label: `${mins}m ago` };
  if (mins < 60) return { stale: true, label: `${mins}m ago` };
  const hrs = Math.round(mins / 60);
  return { stale: true, label: `${hrs}h ago` };
}

export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [error, setError] = useState<'not_found' | 'error' | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartHours, setChartHours] = useState(24);
  const quickAsk = useQuickAsk();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPublicProfile(slug)
      .then(setData)
      .catch((err) => setError(err.message === 'not_found' ? 'not_found' : 'error'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>DayArc</h1>
        </header>
        <div className={styles.status}>Loading...</div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>DayArc</h1>
        </header>
        <div className={styles.status}>Profile not found.</div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>DayArc</h1>
        </header>
        <div className={styles.status}>Something went wrong. Please try again later.</div>
        <Footer />
      </div>
    );
  }

  const currentReading = data.currentReading ? toGlucoseReading(data.currentReading) : null;
  const { stale, label: staleLabel } = staleness(data.currentReading);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>DayArc</h1>
        <div className={styles.meta}>
          <span>{data.displayName}</span>
          {staleLabel && <span>Last reading: {staleLabel}</span>}
          <span>DATA SYNC: STORED</span>
        </div>
      </header>

      <Dashboard>
        <CurrentGlucose reading={currentReading} stale={stale} loading={false} />
        <AIAlert patterns={data.patterns} insight={data.insight} onAskAbout={quickAsk.askCustom} />
        <QuickAsk {...quickAsk} />
        <Chart24Hr egvs={data.egvs} loading={false} hours={chartHours} onHoursChange={setChartHours} todayStats={data.todayStats} />
        <ActionableInsight patterns={data.patterns} insight={data.insight} />
        <Patterns patterns={data.patterns} daysWithData={data.windowStats?.length ?? 0} />
        <DaySummary insight={data.insight} />
      </Dashboard>
      <Footer />
    </div>
  );
}
