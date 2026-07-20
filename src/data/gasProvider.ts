import { getChain } from '../config/chains';
import type { ChainId } from './types';

interface BsTx {
  from?: { hash?: string };
  fee?: { value?: string };
}

// Sum of gas fees (wei) the owner PAID — only transactions they sent.
export function sumGasWei(raw: unknown, owner: string): bigint {
  const items = (raw as { items?: BsTx[] })?.items;
  if (!Array.isArray(items)) return 0n;
  const o = owner.toLowerCase();
  let sum = 0n;
  for (const t of items) {
    if (t.from?.hash?.toLowerCase() === o && t.fee?.value) {
      try { sum += BigInt(t.fee.value); } catch { /* skip malformed */ }
    }
  }
  return sum;
}

export async function fetchGasSpent(address: string, chainId: ChainId, maxPages = 8): Promise<bigint> {
  const base = getChain(chainId).blockscoutBaseUrl;
  if (!base) return 0n;
  let total = 0n;
  let query = '';
  for (let page = 0; page < maxPages; page++) {
    let res: Response;
    try {
      res = await fetch(`${base}/api/v2/addresses/${address}/transactions${query}`);
    } catch {
      break;
    }
    if (!res.ok) break;
    const json = (await res.json()) as { next_page_params?: Record<string, string | number> | null };
    total += sumGasWei(json, address);
    const np = json.next_page_params;
    if (!np) break;
    query = '?' + new URLSearchParams(np as Record<string, string>).toString();
  }
  return total;
}
