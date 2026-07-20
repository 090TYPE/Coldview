import { useAppStore } from './store';

// Returns a formatter that converts a USD amount into the user's chosen display
// currency and formats it. Amounts stay USD internally; only display converts.
// Rates live in the store (fetched once in App), so this needs no QueryClient
// and stays usable from any component/test.
export function useMoney(): (usd: number | null | undefined, digits?: number) => string {
  const currency = useAppStore((s) => s.currency);
  const rates = useAppStore((s) => s.fxRates);
  return (usd, digits) => {
    if (usd == null) return '—';
    const rate = rates[currency] ?? 1;
    const v = usd * rate;
    const maximumFractionDigits = digits ?? (Math.abs(v) >= 1 || v === 0 ? 0 : 6);
    try {
      return v.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits });
    } catch {
      return `$${v.toLocaleString('en-US', { maximumFractionDigits })}`;
    }
  };
}
