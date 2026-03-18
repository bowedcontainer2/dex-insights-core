import type { GlucoseReading, DexcomTrend } from '../../types/dexcom';
import { trendDescription, formatRate } from '../../utils/glucose';
import { Panel, PanelHeader, PanelBody } from '../Panel';
import styles from './CurrentGlucose.module.css';

function TrendArrowSVG({ trend }: { trend: DexcomTrend }) {
  let rotation = 0;
  switch (trend) {
    case 'doubleUp':
    case 'singleUp': rotation = -45; break;
    case 'fortyFiveUp': rotation = 0; break;
    case 'flat': rotation = 45; break;
    case 'fortyFiveDown': rotation = 90; break;
    case 'singleDown':
    case 'doubleDown': rotation = 135; break;
    default: rotation = 45;
  }

  return (
    <svg
      width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="4"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M7 17L17 7M17 7H7M17 7V17" />
    </svg>
  );
}

interface Props {
  reading: GlucoseReading | null;
  stale: boolean;
  loading: boolean;
}

export default function CurrentGlucose({ reading, stale, loading }: Props) {
  return (
    <Panel gridColumn="span 4" gridRow="span 2">
      <svg className={styles.star} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path d="M50 0 L55 45 L100 50 L55 55 L50 100 L45 55 L0 50 L45 45 Z" fill="currentColor" />
        <path d="M15 15 L45 45 M85 15 L55 45 M85 85 L55 55 M15 85 L45 55" stroke="currentColor" strokeWidth="2" />
      </svg>

      <PanelHeader>
        <span>Current Glucose</span>
        <span>Mg/DL</span>
      </PanelHeader>

      <PanelBody style={{ position: 'relative', zIndex: 2 }}>
        {loading && !reading ? (
          <>
            <div className={`${styles.reading} ${styles.skeletonReading}`}>
              <div className={styles.shimmer} />
            </div>
            <div className={styles.trend}>
              <div className={styles.ledRow}>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className={styles.ledDot} style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </>
        ) : reading ? (
          <>
            <div className={styles.reading}>{reading.value}</div>
            <div className={styles.trend}>
              <TrendArrowSVG trend={reading.trend} />
              <span>
                {trendDescription(reading.trend)}
                {reading.trendRate !== null && ` / ${formatRate(reading.trendRate)}`}
              </span>
            </div>
            {stale && <div className={styles.stale}>STALE</div>}
          </>
        ) : (
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'auto' }}>No data</div>
        )}
      </PanelBody>
    </Panel>
  );
}
