import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import type { SnapshotPoint } from '../data/snapshot';

export function ValueChart({ series }: { series: SnapshotPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={series} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="cvfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22e6a4" stopOpacity={0.35} />
            <stop offset="1" stopColor="#22e6a4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area type="monotone" dataKey="v" stroke="#22e6a4" strokeWidth={2} fill="url(#cvfill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
