import { getChain } from '../config/chains';
import type { Holding } from './types';

function cell(v: string | number | null): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function holdingsToCsv(holdings: Holding[]): string {
  const header = ['Asset', 'Chain', 'Balance', 'Price USD', 'Value USD', '24h %'];
  const rows = holdings.map((h) =>
    [cell(h.symbol), cell(getChain(h.chainId).name), cell(h.amount), cell(h.priceUsd), cell(h.valueUsd), cell(h.change24hPct)].join(','),
  );
  return [header.join(','), ...rows].join('\n') + '\n';
}
