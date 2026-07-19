import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchNfts } from '../data/nftProvider';
import type { ChainId, Nft } from '../data/types';
import type { Wallet } from '../data/walletStore';

async function loadNfts(wallets: Wallet[], chains: ChainId[]): Promise<Nft[]> {
  // EVM-only: NFT indexing for Solana/Bitcoin isn't available keyless here.
  const pairs = wallets.flatMap((w) =>
    chains.filter((c) => getChain(c).family === 'evm' && w.family === 'evm').map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchNfts(p.address, p.chain)));
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

export function useNfts(wallets: Wallet[], chains: ChainId[], enabled: boolean) {
  return useQuery({
    queryKey: ['nfts', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadNfts(wallets, chains),
    enabled: enabled && wallets.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
