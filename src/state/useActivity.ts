import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchTransfers } from '../data/txProvider';
import { fetchBitcoinTransfers } from '../data/bitcoinTxProvider';
import { fetchSolanaTransfers } from '../data/solanaTxProvider';
import { hydrateHistoricalUsd } from '../data/historicalPrice';
import { buildActivity } from '../data/activity';
import type { ChainId, Transfer, ActivityRow } from '../data/types';
import type { Wallet } from '../data/walletStore';

async function loadActivity(wallets: Wallet[], chains: ChainId[]): Promise<ActivityRow[]> {
  // Only pair a wallet with chains in its own family; dispatch to the right
  // provider per family (EVM = Blockscout, Bitcoin = esplora, Solana = RPC).
  const jobs = wallets.flatMap((w) =>
    chains
      .filter((c) => getChain(c).family === w.family)
      .map((c) => {
        const family = getChain(c).family;
        if (family === 'bitcoin') return () => fetchBitcoinTransfers(w.address);
        if (family === 'solana') return () => fetchSolanaTransfers(w.address);
        return () => fetchTransfers(w.address, c);
      }),
  );
  const results = await Promise.allSettled(jobs.map((run) => run()));
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
