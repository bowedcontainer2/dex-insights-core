import type { DexcomEGV, DailyStats } from '../../types/dexcom';
import { Panel, PanelHeader } from '../Panel';
import LineChart from '../chart/LineChart';
import styles from './Chart24Hr.module.css';

const TIME_RANGES = [3, 6, 12, 24] as const;

interface Props {
  egvs: DexcomEGV[];
  loading: boolean;
  hours: number;
  onHoursChange: (hours: number) => void;
  todayStats: DailyStats | null;
}

function Screw({ top, left, right, bottom }: { top?: number; left?: number; right?: number; bottom?: number }) {
  return (
    <div className={styles.screw} style={{ top, left, right, bottom }}>
      <div className={styles.screwSlot} />
    </div>
  );
}

export default function Chart24Hr({ egvs, loading, hours, onHoursChange, todayStats }: Props) {
  const tir = todayStats ? `${todayStats.timeInRangePct}%` : '--';
  const tbr = todayStats ? `${todayStats.timeBelowPct}%` : '--';

  return (
    <Panel gridColumn="span 8" gridRow="span 4" style={{ border: 'none', background: 'none' }}>
      <PanelHeader style={{ border: 'var(--border-thin)' }}>
        <span>{hours}HR Trajectory & Prediction</span>
        <div className={styles.rangeBar}>
          <div className={styles.stats}>
            <span>TIR: {tir}</span>
            <span>TBR: {tbr}</span>
          </div>
          <div className={styles.timeButtons}>
            {TIME_RANGES.map((h) => (
              <button
                key={h}
                className={styles.timeButton}
                onClick={() => onHoursChange(h)}
                style={{
                  background: hours === h ? 'var(--fg)' : 'transparent',
                  color: hours === h ? 'var(--bg)' : 'var(--fg)',
                  fontWeight: hours === h ? 900 : 700,
                }}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </PanelHeader>

      <div className={styles.chartArea}>
        <div className={styles.hardwareFrame}>
          <div className={styles.frameInsetBorder} />
          <div className={styles.frameAmbientLight} />

          <div className={styles.displayBezel}>
            <div className={styles.bezelBrand}>DEXCOM</div>
            <div className={styles.bezelHighlight} />

            <Screw top={14} left={16} />
            <Screw top={14} right={16} />
            <Screw bottom={14} left={16} />
            <Screw bottom={14} right={16} />

            <div className={styles.screenArea}>
              <div className={styles.deviceLabel}>Glucose Monitor — Model 7</div>
              <div className={styles.screenCorners} />
              <div className={styles.screenScanlines} />
              <div className={styles.screenFade} />
              <div className={styles.chartInner}>
                {loading && egvs.length === 0 ? (
                  <div className={styles.waveLoading}>
                    <div className={styles.waveContainer}>
                      <div className={styles.waveLine} />
                      {Array.from({ length: 7 }, (_, i) => (
                        <div key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <div className={styles.waveLabel}>Signal Input</div>
                  </div>
                ) : (
                  <LineChart egvs={egvs} hours={hours} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
