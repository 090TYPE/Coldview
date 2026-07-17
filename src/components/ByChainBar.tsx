import type { AllocationSlice } from '../data/types';
import { COLORS } from './AllocationRing';

export function ByChainBar({ slices }: { slices: AllocationSlice[] }) {
  return (
    <div>
      <div className="flex h-2 rounded overflow-hidden mt-1.5">
        {slices.map((s, i) => (
          <div key={s.label} style={{ width: `${s.pct}%`, background: COLORS[i % COLORS.length] }} />
        ))}
      </div>
      <div className="text-[11px] text-muted mt-1.5">
        {slices.map((s) => `${s.label} ${s.pct.toFixed(0)}%`).join(' · ')}
      </div>
    </div>
  );
}
