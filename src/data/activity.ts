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

export function computeFlows(
  rows: ActivityRow[],
  ownedAddresses: Set<string>,
  currentUsdBySymbol: Map<string, number>,
): { perToken: FlowRow[]; totalInvested: number; totalCurrent: number; totalGain: number } {
  const invested = new Map<string, number>();
  for (const r of rows) {
    if (r.usdAtTime === null) continue;
    if (ownedAddresses.has(r.counterparty)) continue;
    const cur = invested.get(r.symbol) ?? 0;
    invested.set(r.symbol, cur + (r.direction === 'in' ? r.usdAtTime : -r.usdAtTime));
  }
  const symbols = new Set<string>([...invested.keys(), ...currentUsdBySymbol.keys()]);
  const perToken: FlowRow[] = [];
  for (const symbol of symbols) {
    const investedUsd = invested.get(symbol) ?? 0;
    const currentUsd = currentUsdBySymbol.get(symbol) ?? 0;
    if (investedUsd === 0 && currentUsd === 0) continue;
    perToken.push({ symbol, investedUsd, currentUsd, gainUsd: currentUsd - investedUsd });
  }
  perToken.sort((a, b) => b.currentUsd - a.currentUsd);
  const totalInvested = perToken.reduce((s, r) => s + r.investedUsd, 0);
  const totalCurrent = perToken.reduce((s, r) => s + r.currentUsd, 0);
  return { perToken, totalInvested, totalCurrent, totalGain: totalCurrent - totalInvested };
}
