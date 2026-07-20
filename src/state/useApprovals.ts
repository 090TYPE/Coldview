import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchApprovalLogs } from '../data/approvalsProvider';
import type { ChainId, TokenApproval } from '../data/types';
import type { Wallet } from '../data/walletStore';

// Active ERC-20 approvals across all EVM wallet×chain pairs, flattened.
async function loadApprovals(wallets: Wallet[], chains: ChainId[]): Promise<TokenApproval[]> {
  const pairs = wallets.flatMap((w) =>
    chains
      .filter((c) => getChain(c).family === 'evm' && w.family === 'evm')
      .map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchApprovalLogs(p.address, p.chain)));
  const out: TokenApproval[] = [];
  for (const r of results) if (r.status === 'fulfilled') out.push(...r.value);
  return out;
}

export function useApprovals(wallets: Wallet[], chains: ChainId[], enabled: boolean) {
  return useQuery({
    queryKey: ['approvals', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadApprovals(wallets, chains),
    enabled: enabled && wallets.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
