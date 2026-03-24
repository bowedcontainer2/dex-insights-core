import type { InsightsResponse } from '../../types/dexcom';
import { Panel, PanelHeader, PanelBody } from '../Panel';
import styles from './DaySummary.module.css';

interface Props {
  insight?: InsightsResponse | null;
}

export default function DaySummary({ insight }: Props) {
  if (!insight || insight.source !== 'llm' || !insight.daySummary) return null;

  return (
    <Panel gridColumn="1 / -1" gridRow="span 1">
      <PanelHeader>Yesterday's Recap</PanelHeader>
      <PanelBody style={{ justifyContent: 'center' }}>
        <p className={styles.text}>{insight.daySummary}</p>
      </PanelBody>
    </Panel>
  );
}
