import { Panel, Label } from './primitives';
import { TotalBalance } from './TotalBalance';
import { PeriodToggle } from './PeriodToggle';
import { ValueChart } from './ValueChart';
import type { Period } from '../state/store';
import type { SnapshotPoint } from '../data/snapshot';

interface Props {
  total: number;
  change24h: number;
  walletCount: number;
  period: Period;
  onPeriod: (p: Period) => void;
  series: SnapshotPoint[];
}

export function HeroPanel({ total, change24h, walletCount, period, onPeriod, series }: Props) {
  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <TotalBalance total={total} change24h={change24h} walletCount={walletCount} />
        <PeriodToggle value={period} onChange={onPeriod} />
      </div>
      <div className="mt-2.5">
        {series.length < 2 ? (
          <div className="text-[11px] text-muted py-8 text-center">
            Your value chart builds as you use Coldview — check back over time.
          </div>
        ) : (
          <>
            <ValueChart series={series} />
            <Label>portfolio value · self-recorded snapshots</Label>
          </>
        )}
      </div>
    </Panel>
  );
}
