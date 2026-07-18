import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchTransfers } from '../data/txProvider';
import { hydrateHistoricalUsd } from '../data/historicalPrice';
import { buildActivity } from '../data/activity';
import type { ChainId, Transfer, ActivityRow } from '../data/types';
import type { Wallet } from '../data/walletStore';

async function loadActivity(wallets: Wallet[], chains: ChainId[]): Promise<ActivityRow[]> {
  const pairs = wallets.flatMap((w) =>
    chains
      .filter((c) => getChain(c).family === 'evm' && w.family === 'evm')
      .map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchTransfers(p.address, p.chain)));
  const transfers: Transfer[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  transfers.sort((a, b) => b.timestamp - a.timestamp);
  const usd = await hydrateHistoricalUsd(transfers);
  return buildActivity(transfers, usd);
}

export function useActivity(wallets: Wallet[], chains: ChainId[], enabled: boolean) {
  return useQuery({
    queryKey: ['activity', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadActivity(wallets, chains),
    enabled: enabled && wallets.length > 0,
    staleTime: 60_000,
    retry: 1,
  });
}
