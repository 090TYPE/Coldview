import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchAllTransfers } from '../data/txProvider';
import { hydrateHistoricalUsd } from '../data/historicalPrice';
import { computePnl, type PnlSummary } from '../data/costBasis';
import type { ChainId, Holding, Transfer } from '../data/types';
import type { Wallet } from '../data/walletStore';

async function loadPnl(wallets: Wallet[], chains: ChainId[], holdings: Holding[]): Promise<PnlSummary> {
  // Cost-basis history is only available (keyless) for EVM chains.
  const evmHoldings = holdings.filter((h) => getChain(h.chainId).family === 'evm');
  const pairs = wallets.flatMap((w) =>
    chains.filter((c) => getChain(c).family === 'evm' && w.family === 'evm').map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchAllTransfers(p.address, p.chain)));
  const transfers: Transfer[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const usd = await hydrateHistoricalUsd(transfers);
  const owned = new Set(wallets.map((w) => w.address.toLowerCase()));
  return computePnl(transfers, evmHoldings, usd, owned);
}

export function usePnl(wallets: Wallet[], chains: ChainId[], holdings: Holding[], enabled: boolean) {
  return useQuery({
    queryKey: [
      'pnl',
      wallets.map((w) => w.address).sort(),
      [...chains].sort(),
      holdings.map((h) => `${h.key}:${h.amount}`).sort(),
    ],
    queryFn: () => loadPnl(wallets, chains, holdings),
    enabled: enabled && wallets.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
