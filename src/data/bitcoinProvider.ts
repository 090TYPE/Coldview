import { getChain } from '../config/chains';
import { parseEsploraBalance } from './parseEsplora';
import type { TokenBalance } from './types';

export async function fetchBitcoinBalance(address: string): Promise<TokenBalance[]> {
  const base = getChain('bitcoin').esploraBaseUrl!;
  const res = await fetch(`${base}/api/address/${address}`);
  if (!res.ok) return [];
  const btc = parseEsploraBalance(await res.json());
  return btc ? [btc] : [];
}
