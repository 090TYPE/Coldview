import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchGasSpent } from '../data/gasProvider';
import type { ChainId } from '../data/types';
import type { Wallet } from '../data/walletStore';

// Total gas paid (wei) per EVM chain across tracked history, as strings so the
// query cache stays JSON-serializable.
async function loadGas(wallets: Wallet[], chains: ChainId[]): Promise<Record<string, string>> {
  const pairs = wallets.flatMap((w) =>
    chains.filter((c) => getChain(c).family === 'evm' && w.family === 'evm').map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchGasSpent(p.address, p.chain)));
  const byChain: Record<string, bigint> = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const c = pairs[i].chain;
      byChain[c] = (byChain[c] ?? 0n) + r.value;
    }
  });
  return Object.fromEntries(Object.entries(byChain).map(([c, wei]) => [c, wei.toString()]));
}

export function useGas(wallets: Wallet[], chains: ChainId[], enabled: boolean) {
  return useQuery({
    queryKey: ['gas', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadGas(wallets, chains),
    enabled: enabled && wallets.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
