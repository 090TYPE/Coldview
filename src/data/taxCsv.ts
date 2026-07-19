import { getChain } from '../config/chains';
import type { RealizedEvent } from './costBasis';

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const isoDate = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);
const round = (n: number) => Math.round(n * 100) / 100;

// A capital-gains report: one row per FIFO lot match (like IRS Form 8949).
export function realizedEventsToCsv(events: RealizedEvent[]): string {
  const header = ['Disposed', 'Asset', 'Chain', 'Amount', 'Proceeds USD', 'Cost basis USD', 'Gain USD', 'Acquired', 'Term'];
  const rows = events.map((e) => {
    const term = e.disposedTs - e.acquiredTs >= 365 * 86400 ? 'long' : 'short';
    return [
      cell(isoDate(e.disposedTs)), cell(e.symbol), cell(getChain(e.chainId).name),
      cell(e.amount), cell(round(e.proceedsUsd)), cell(round(e.costBasisUsd)), cell(round(e.gainUsd)),
      cell(isoDate(e.acquiredTs)), cell(term),
    ].join(',');
  });
  return [header.join(','), ...rows].join('\n') + '\n';
}
