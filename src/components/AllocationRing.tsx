import type { AllocationSlice } from '../data/types';

const COLORS = ['#22e6a4', '#3aa0ff', '#ffb020', '#8a5cff', '#5eead4', '#ff5c72'];

export function AllocationRing({ slices }: { slices: AllocationSlice[] }) {
  const top = slices.slice(0, 5);
  const rest = slices.slice(5).reduce((s, x) => s + x.pct, 0);
  const parts = rest > 0 ? [...top, { label: 'Other', valueUsd: 0, pct: rest }] : top;

  let acc = 0;
  const stops = parts
    .map((p, i) => {
      const from = acc;
      acc += p.pct;
      return `${COLORS[i % COLORS.length]} ${from}% ${acc}%`;
    })
    .join(', ');

  return (
    <div
      className="w-[120px] h-[120px] rounded-full"
      style={{
        background: `conic-gradient(${stops})`,
        WebkitMask: 'radial-gradient(circle 40px at 50% 50%, transparent 39px, #000 40px)',
        mask: 'radial-gradient(circle 40px at 50% 50%, transparent 39px, #000 40px)',
      }}
      aria-label="allocation ring"
    />
  );
}

export { COLORS };
