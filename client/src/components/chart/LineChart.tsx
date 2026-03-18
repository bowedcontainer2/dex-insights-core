import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { DexcomEGV } from '../../types/dexcom';

// Screen-specific colors (chart renders on cream background inside hardware bezel)
const SCREEN_FG = '#2a221c';
const SCREEN_ACCENT = '#5e6647';

interface Props {
  egvs: DexcomEGV[];
  hours?: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { value, time } = payload[0].payload;
  const d = new Date(time);
  return (
    <div style={{
      background: SCREEN_FG,
      border: '2px solid #e8dfd1',
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
    }}>
      <div style={{ color: '#e8dfd1', fontWeight: 900 }}>{value} mg/dL</div>
      <div style={{ color: 'rgba(232, 223, 209, 0.7)', marginTop: '0.25rem' }}>
        {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </div>
    </div>
  );
}

function CurrentDot(props: any) {
  const { cx, cy, index, dataLength } = props;
  if (index !== dataLength - 1) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="none" stroke={SCREEN_FG} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={6} fill={SCREEN_FG} />
    </g>
  );
}

export default function LineChart({ egvs, hours = 24 }: Props) {
  if (egvs.length === 0) return null;

  const now = Date.now();
  const windowStart = now - hours * 60 * 60 * 1000;

  const filtered = egvs.filter((e) => new Date(e.systemTime).getTime() >= windowStart);
  const data = filtered.map((e) => ({
    time: new Date(e.systemTime).getTime(),
    value: e.value,
  }));

  if (data.length === 0) return null;

  const dataLength = data.length;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
        <defs>
          <pattern id="hatchPattern" patternUnits="userSpaceOnUse" width="4" height="4">
            <line x1="0" y1="0" x2="0" y2="4" stroke={`rgba(94, 102, 71, 0.1)`} strokeWidth="1" />
          </pattern>
        </defs>

        <CartesianGrid stroke="rgba(42, 34, 28, 0.1)" strokeWidth={1} vertical={false} />

        <ReferenceArea
          y1={70}
          y2={180}
          fill="url(#hatchPattern)"
          ifOverflow="extendDomain"
        />
        <ReferenceLine y={70} stroke={SCREEN_ACCENT} strokeDasharray="4 4" strokeOpacity={0.6} />
        <ReferenceLine y={180} stroke={SCREEN_ACCENT} strokeDasharray="4 4" strokeOpacity={0.6} />

        <XAxis
          dataKey="time"
          type="number"
          domain={[windowStart, now]}
          tickFormatter={formatTime}
          stroke="rgba(42, 34, 28, 0.3)"
          tick={{ fill: 'rgba(42, 34, 28, 0.7)', fontSize: 11, fontWeight: 800 }}
          tickLine={false}
          axisLine={{ stroke: SCREEN_FG }}
          interval="preserveStartEnd"
          tickCount={7}
        />
        <YAxis
          domain={[40, 350]}
          ticks={[70, 120, 180, 250, 300]}
          stroke="rgba(42, 34, 28, 0.3)"
          tick={{ fill: 'rgba(42, 34, 28, 0.7)', fontSize: 11, fontWeight: 800 }}
          tickLine={false}
          axisLine={{ stroke: SCREEN_FG }}
          width={36}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(42, 34, 28, 0.3)', strokeDasharray: '3 3' }} />

        <Line
          type="monotone"
          dataKey="value"
          stroke={SCREEN_FG}
          strokeWidth={5}
          strokeLinejoin="round"
          strokeLinecap="round"
          dot={false}
          activeDot={{ r: 5, fill: SCREEN_FG, stroke: SCREEN_FG, strokeWidth: 2 }}
          isAnimationActive={false}
          style={{ filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.4))' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="transparent"
          strokeWidth={0}
          dot={(props: any) => <CurrentDot {...props} dataLength={dataLength} />}
          isAnimationActive={false}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
