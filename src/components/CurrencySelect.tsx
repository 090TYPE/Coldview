import { useAppStore } from '../state/store';
import { CURRENCIES } from '../data/fxProvider';

export function CurrencySelect() {
  const { currency, setCurrency } = useAppStore();
  return (
    <select
      aria-label="Display currency"
      title="Display currency"
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="bg-panel border border-border rounded-full px-2.5 py-1 text-[12px] text-muted outline-none hover:border-neon"
    >
      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
