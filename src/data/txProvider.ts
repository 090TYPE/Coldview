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

// Follows Blockscout's next_page_params to pull deeper history (bounded by
// maxPages so a very active wallet can't trigger runaway requests). Used by the
// P&L engine, which needs as complete a trade history as it can get.
async function fetchPaged(
  url: string,
  parse: (raw: unknown) => Transfer[],
  maxPages: number,
): Promise<Transfer[]> {
  const out: Transfer[] = [];
  let query = '';
  for (let page = 0; page < maxPages; page++) {
    let res: Response;
    try {
      res = await fetch(url + query);
    } catch {
      break;
    }
    if (!res.ok) break;
    const json = (await res.json()) as { next_page_params?: Record<string, string | number> | null };
    out.push(...parse(json));
    const np = json.next_page_params;
    if (!np) break;
    query = '?' + new URLSearchParams(np as Record<string, string>).toString();
  }
  return out;
}

export async function fetchAllTransfers(address: string, chainId: ChainId, maxPages = 8): Promise<Transfer[]> {
  const chain = getChain(chainId);
  const base = chain.blockscoutBaseUrl!;
  const [tok, tx] = await Promise.allSettled([
    fetchPaged(`${base}/api/v2/addresses/${address}/token-transfers`, (j) => parseTokenTransfers(j, chainId, address), maxPages),
    fetchPaged(`${base}/api/v2/addresses/${address}/transactions`, (j) => parseNativeTxs(j, chainId, address, chain.nativeSymbol), maxPages),
  ]);
  const out: Transfer[] = [];
  if (tok.status === 'fulfilled') out.push(...tok.value);
  if (tx.status === 'fulfilled') out.push(...tx.value);
  return out.sort((a, b) => b.timestamp - a.timestamp);
}
