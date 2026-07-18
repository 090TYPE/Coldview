import { defiLlamaKeys, parseDefiLlamaPrices } from './parseDefiLlama';
import type { Price, TokenBalance, TokenKey } from './types';

// DefiLlama takes the coins as a comma-joined path segment, so a wallet with many
// tokens would blow past URL length limits (414) and lose ALL prices. Chunk the
// keys and fetch each batch independently so one failed/oversized batch can't wipe
// out the rest.
const CHUNK = 50;

export async function fetchPrices(balances: TokenBalance[]): Promise<Record<TokenKey, Price>> {
  const req = defiLlamaKeys(balances);
  if (req.llamaKeys.length === 0) return {};

  const chunks: string[][] = [];
  for (let i = 0; i < req.llamaKeys.length; i += CHUNK) {
    chunks.push(req.llamaKeys.slice(i, i + CHUNK));
  }

  const results = await Promise.allSettled(
    chunks.map(async (keys) => {
      const res = await fetch(`https://coins.llama.fi/prices/current/${keys.join(',')}`);
      if (!res.ok) return null;
      return res.json();
    }),
  );

  const merged: Record<TokenKey, Price> = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      Object.assign(merged, parseDefiLlamaPrices(r.value, req.byLlamaKey));
    }
  }
  return merged;
}
