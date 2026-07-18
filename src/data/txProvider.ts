import { getChain } from '../config/chains';
import { parseTokenTransfers, parseNativeTxs } from './parseTransfers';
import type { ChainId, Transfer } from './types';

export async function fetchTransfers(address: string, chainId: ChainId): Promise<Transfer[]> {
  const chain = getChain(chainId);
  const base = chain.blockscoutBaseUrl!;
  const [tokRes, txRes] = await Promise.allSettled([
    fetch(`${base}/api/v2/addresses/${address}/token-transfers`),
    fetch(`${base}/api/v2/addresses/${address}/transactions`),
  ]);
  const out: Transfer[] = [];
  if (tokRes.status === 'fulfilled' && tokRes.value.ok) {
    out.push(...parseTokenTransfers(await tokRes.value.json(), chainId, address));
  }
  if (txRes.status === 'fulfilled' && txRes.value.ok) {
    out.push(...parseNativeTxs(await txRes.value.json(), chainId, address, chain.nativeSymbol));
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}
