import { Panel, Label } from './primitives';
import { AllocationRing, COLORS } from './AllocationRing';
import { ByChainBar } from './ByChainBar';
import type { AllocationSlice } from '../data/types';

export function AllocationPanel({ byToken, byChain }: { byToken: AllocationSlice[]; byChain: AllocationSlice[] }) {
  const legend = byToken.slice(0, 4);
  return (
    <Panel>
      <Label>Allocation</Label>
      <div className="flex gap-3.5 items-center mt-3">
        <AllocationRing slices={byToken} />
        <div className="flex-1 text-[12px]">
          {legend.map((s, i) => (
            <div key={s.label} className="flex justify-between py-[3px]">
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2" style={{ background: COLORS[i % COLORS.length] }} />
                {s.label}
              </span>
              <span>{s.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3.5">
        <Label>By chain</Label>
        <ByChainBar slices={byChain} />
      </div>
    </Panel>
  );
}
