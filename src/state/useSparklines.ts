import { useQuery } from '@tanstack/react-query';
import { fetchSparklines } from '../data/sparklineProvider';
import type { ChainId, Holding, TokenBalance, TokenKey } from '../data/types';

// Fetches a 7-day daily price series for each holding, keyed by TokenKey.
// Derives the (chain, contract) identity from the holding key. Solana SPL mints
// are lowercased in the key, so their series may be absent — the UI degrades to
// a placeholder, which is fine.
export function useSparklines(holdings: Holding[]): Record<TokenKey, number[]> {
  const balances: TokenBalance[] = holdings.map((h) => {
    const idx = h.key.indexOf(':');
    const chainId = h.key.slice(0, idx) as ChainId;
    const rest = h.key.slice(idx + 1);
    return { chainId, contract: rest === 'native' ? null : rest, symbol: h.symbol, decimals: 0, rawBalance: '0' };
  });
  const keys = holdings.map((h) => h.key).sort();
  const { data } = useQuery({
    queryKey: ['spark', keys],
    enabled: keys.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: () => fetchSparklines(balances),
  });
  return data ?? {};
}
