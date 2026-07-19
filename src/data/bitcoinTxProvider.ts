import { getChain } from '../config/chains';
import { parseBitcoinTxs } from './parseTransfers';
import type { Transfer } from './types';

// Recent Bitcoin transaction history via esplora. Returns the most recent ~25
// confirmed+mempool txs that move value to/from the address.
export async function fetchBitcoinTransfers(address: string): Promise<Transfer[]> {
  const base = getChain('bitcoin').esploraBaseUrl!;
  const res = await fetch(`${base}/api/address/${address}/txs`);
  if (!res.ok) return [];
  return parseBitcoinTxs(await res.json(), address);
}
