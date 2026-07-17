import { defiLlamaKeys, parseDefiLlamaPrices } from './parseDefiLlama';
import type { Price, TokenBalance, TokenKey } from './types';

export async function fetchPrices(balances: TokenBalance[]): Promise<Record<TokenKey, Price>> {
  const req = defiLlamaKeys(balances);
  if (req.llamaKeys.length === 0) return {};
  const url = `https://coins.llama.fi/prices/current/${req.llamaKeys.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  return parseDefiLlamaPrices(await res.json(), req.byLlamaKey);
}
