import { toAmount } from './types';
import { cacheKeyFor } from './historicalPrice';
import type { Transfer, ActivityRow, FlowRow } from './types';

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
