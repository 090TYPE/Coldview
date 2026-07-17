import type { Period } from '../state/store';

const PERIODS: Period[] = ['24h', '7d', '30d', 'all'];

export function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-pressed={p === value}
          className={`text-[11px] px-2 py-0.5 rounded-full border ${
            p === value ? 'border-neon text-neon bg-neon/10' : 'border-border text-[#9fb0bd]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
