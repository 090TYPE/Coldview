import { useQuery } from '@tanstack/react-query';
import { resolveEns } from '../data/ensProvider';

export interface EnsInfo {
  name: string | null;
  avatar: string | null;
}

// Resolves the primary ENS name + avatar for each EVM address. Returns a map
// keyed by lowercased address. Non-EVM addresses are skipped.
export function useEnsNames(addresses: string[]): Record<string, EnsInfo> {
  const evm = addresses.filter((a) => a.startsWith('0x'));
  const { data } = useQuery({
    queryKey: ['ens', [...evm].sort()],
    enabled: evm.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const out: Record<string, EnsInfo> = {};
      await Promise.all(
        evm.map(async (a) => {
          const r = await resolveEns(a);
          out[a.toLowerCase()] = { name: r?.name ?? null, avatar: r?.avatar ?? null };
        }),
      );
      return out;
    },
  });
  return data ?? {};
}
