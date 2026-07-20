import { toAmount } from './types';
import { cacheKeyFor } from './historicalPrice';
import type { ChainId, Transfer, ActivityRow, FlowRow } from './types';

export type ActivityLabel = 'swap' | 'send' | 'receive' | 'self';

// A transaction that both sends and receives (same txHash on the same chain) is
// a swap. Used to label Activity rows without any extra network calls.
export function buildTxKinds(
  rows: { chainId: ChainId; txHash: string; direction: 'in' | 'out' }[],
): Map<string, { in: boolean; out: boolean }> {
  const m = new Map<string, { in: boolean; out: boolean }>();
  for (const r of rows) {
    const key = `${r.chainId}:${r.txHash}`;
    const e = m.get(key) ?? { in: false, out: false };
    if (r.direction === 'in') e.in = true;
    else e.out = true;
    m.set(key, e);
  }
  return m;
}

export function activityLabel(
  row: { chainId: ChainId; txHash: string; direction: 'in' | 'out'; counterparty: string },
  txKinds: Map<string, { in: boolean; out: boolean }>,
  owned: Set<string>,
): ActivityLabel {
  if (owned.has(row.counterparty)) return 'self';
  const k = txKinds.get(`${row.chainId}:${row.txHash}`);
  if (k?.in && k?.out) return 'swap';
  return row.direction === 'in' ? 'receive' : 'send';
}

export function buildActivity(transfers: Transfer[], unitUsdByCacheKey: Map<string, number>): ActivityRow[] {
  return transfers.map((t) => {
    const ck = cacheKeyFor(t);
    const unit = ck ? unitUsdByCacheKey.get(ck) : undefined;
    const usdAtTime = unit !== undefined ? toAmount(t.rawAmount, t.decimals) * unit : null;
    return { ...t, usdAtTime };
  });
}

export function computeRecentFlows(
  rows: ActivityRow[],
  ownedAddresses: Set<string>,
): { perToken: FlowRow[]; totalIn: number; totalOut: number; totalNet: number } {
  const inBy = new Map<string, number>();
  const outBy = new Map<string, number>();
  for (const r of rows) {
    if (r.usdAtTime === null) continue;
    if (ownedAddresses.has(r.counterparty)) continue; // moving your own funds isn't a flow
    if (r.direction === 'in') inBy.set(r.symbol, (inBy.get(r.symbol) ?? 0) + r.usdAtTime);
    else outBy.set(r.symbol, (outBy.get(r.symbol) ?? 0) + r.usdAtTime);
  }
  const symbols = new Set<string>([...inBy.keys(), ...outBy.keys()]);
  const perToken: FlowRow[] = [];
  for (const symbol of symbols) {
    const inUsd = inBy.get(symbol) ?? 0;
    const outUsd = outBy.get(symbol) ?? 0;
    perToken.push({ symbol, inUsd, outUsd, netUsd: inUsd - outUsd });
  }
  perToken.sort((a, b) => (b.inUsd + b.outUsd) - (a.inUsd + a.outUsd));
  const totalIn = perToken.reduce((s, r) => s + r.inUsd, 0);
  const totalOut = perToken.reduce((s, r) => s + r.outUsd, 0);
  return { perToken, totalIn, totalOut, totalNet: totalIn - totalOut };
}
