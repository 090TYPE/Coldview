import { useQuery } from '@tanstack/react-query';
import { fetchBalances } from '../data/balanceProvider';
import { fetchPrices } from '../data/priceProvider';
import { aggregatePortfolio } from '../data/aggregate';
import { appendSnapshot } from '../data/snapshot';
import { getChain } from '../config/chains';
import type { ChainId, TokenBalance, TokenKey, Price, PortfolioSnapshot } from '../data/types';
import type { Wallet } from '../data/walletStore';

async function loadPortfolio(wallets: Wallet[], chains: ChainId[]): Promise<PortfolioSnapshot> {
  const pairs = wallets.flatMap((w) =>
    chains.filter((c) => getChain(c).family === w.family).map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchBalances(p.address, p.chain)));
  const balances: TokenBalance[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  let prices: Record<TokenKey, Price> = {};
  try {
    prices = await fetchPrices(balances);
  } catch {
    prices = {};
  }
  const snapshot = aggregatePortfolio(balances, prices, { minValueUsd: 0.01 });

  if (snapshot.totalValueUsd > 0) {
    await appendSnapshot(snapshot.totalValueUsd);
  }
  return snapshot;
}

export function usePortfolio(wallets: Wallet[], chains: ChainId[]) {
  return useQuery({
    queryKey: ['portfolio', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadPortfolio(wallets, chains),
    enabled: wallets.length > 0 && chains.length > 0,
    staleTime: 60_000,
    retry: 1,
  });
}
