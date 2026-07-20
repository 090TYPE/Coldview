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
      if (!existing.iconUrl && b.iconUrl) existing.iconUrl = b.iconUrl;
    } else {
      merged.set(k, { ...b });
    }
  }

  // 2. Price each holding.
  const holdings: Holding[] = [];
  for (const [k, b] of merged) {
    const amount = toAmount(b.rawBalance, b.decimals);
    const price = prices[k];
    // Prefer the market price (DefiLlama); fall back to the balance source's own
    // spot rate (Blockscout exchange_rate) so priced-but-unlisted tokens still count.
    const fallback = b.fallbackPriceUsd != null && b.fallbackPriceUsd > 0 ? b.fallbackPriceUsd : null;
    const priceUsd = price ? price.usd : fallback;
    const valueUsd = priceUsd !== null ? amount * priceUsd : null;
    const change24hPct = price ? price.change24hPct : null;
    const symbol = b.symbol || price?.symbol || shortMint(b.contract);
    holdings.push({ key: k, chainId: b.chainId, symbol, amount, priceUsd, valueUsd, change24hPct, iconUrl: b.iconUrl ?? null });
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
  const byToken = groupSlices(kept, (h) => h.symbol, totalValueUsd, (h) => h.iconUrl);
  const byChain = groupSlices(kept, (h) => getChain(h.chainId).name, totalValueUsd);

  return { holdings: kept, totalValueUsd, change24hPct, byToken, byChain };
}

function groupSlices(
  holdings: Holding[],
  labelOf: (h: Holding) => string,
  total: number,
  iconOf?: (h: Holding) => string | null,
): AllocationSlice[] {
  const sums = new Map<string, number>();
  const icons = new Map<string, string | null>();
  for (const h of holdings) {
    const label = labelOf(h);
    sums.set(label, (sums.get(label) ?? 0) + (h.valueUsd ?? 0));
    if (iconOf && !icons.get(label)) {
      const ic = iconOf(h);
      if (ic) icons.set(label, ic);
    }
  }
  return [...sums.entries()]
    .map(([label, valueUsd]) => ({ label, valueUsd, pct: total > 0 ? (valueUsd / total) * 100 : 0, iconUrl: icons.get(label) ?? null }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

function shortMint(contract: string | null): string {
  if (!contract) return '???';
  return contract.length > 8 ? `${contract.slice(0, 4)}…${contract.slice(-4)}` : contract;
}
