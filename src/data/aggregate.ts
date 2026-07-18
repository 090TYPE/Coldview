import { keyOf, toAmount } from './types';
import { getChain } from '../config/chains';
import type {
  TokenBalance, TokenKey, Price, Holding, PortfolioSnapshot, AllocationSlice,
} from './types';

interface Options {
  minValueUsd?: number;
}

export function aggregatePortfolio(
  balances: TokenBalance[],
  prices: Record<TokenKey, Price>,
  opts: Options = {},
): PortfolioSnapshot {
  const minValueUsd = opts.minValueUsd ?? 0;

  // 1. Dedupe by (chainId, contract): sum raw balances.
  const merged = new Map<TokenKey, TokenBalance>();
  for (const b of balances) {
    const k = keyOf(b.chainId, b.contract);
    const existing = merged.get(k);
    if (existing) {
      existing.rawBalance = (BigInt(existing.rawBalance) + BigInt(b.rawBalance)).toString();
    } else {
      merged.set(k, { ...b });
    }
  }

  // 2. Price each holding.
  const holdings: Holding[] = [];
  for (const [k, b] of merged) {
    const amount = toAmount(b.rawBalance, b.decimals);
    const price = prices[k];
    const priceUsd = price ? price.usd : null;
    const valueUsd = priceUsd !== null ? amount * priceUsd : null;
    const change24hPct = price ? price.change24hPct : null;
    const symbol = b.symbol || price?.symbol || shortMint(b.contract);
    holdings.push({ key: k, chainId: b.chainId, symbol, amount, priceUsd, valueUsd, change24hPct });
  }

  // 3. Filter dust / priceless below threshold, then sort by value desc.
  const kept = holdings
    .filter((h) => h.valueUsd !== null && h.valueUsd >= minValueUsd)
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

  const totalValueUsd = kept.reduce((s, h) => s + (h.valueUsd ?? 0), 0);

  // 4. Value-weighted 24h change.
  const change24hPct = totalValueUsd > 0
    ? kept.reduce((s, h) => s + (h.valueUsd ?? 0) * (h.change24hPct ?? 0), 0) / totalValueUsd
    : 0;

  // 5. Allocation by token symbol and by chain.
  const byToken = groupSlices(kept, (h) => h.symbol, totalValueUsd);
  const byChain = groupSlices(kept, (h) => getChain(h.chainId).name, totalValueUsd);

  return { holdings: kept, totalValueUsd, change24hPct, byToken, byChain };
}

function groupSlices(
  holdings: Holding[],
  labelOf: (h: Holding) => string,
  total: number,
): AllocationSlice[] {
  const sums = new Map<string, number>();
  for (const h of holdings) {
    sums.set(labelOf(h), (sums.get(labelOf(h)) ?? 0) + (h.valueUsd ?? 0));
  }
  return [...sums.entries()]
    .map(([label, valueUsd]) => ({ label, valueUsd, pct: total > 0 ? (valueUsd / total) * 100 : 0 }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

function shortMint(contract: string | null): string {
  if (!contract) return '???';
  return contract.length > 8 ? `${contract.slice(0, 4)}…${contract.slice(-4)}` : contract;
}
