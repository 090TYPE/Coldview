import { defiLlamaKeys } from './parseDefiLlama';
import type { TokenBalance, TokenKey } from './types';

// DefiLlama's chart endpoint returns a price series per coin. Same URL-length
// concern as current prices, so chunk the keys and merge resiliently.
const CHUNK = 40;

interface ChartResponse {
  coins?: Record<string, { prices?: { timestamp: number; price: number }[] }>;
}

export function parseSparklines(
  raw: unknown,
  byLlamaKey: Record<string, TokenKey>,
): Record<TokenKey, number[]> {
  const res = raw as ChartResponse;
  const out: Record<TokenKey, number[]> = {};
  if (!res?.coins) return out;
  for (const [llamaKey, data] of Object.entries(res.coins)) {
    const ourKey = byLlamaKey[llamaKey];
    if (!ourKey) continue;
    const prices = (data.prices ?? []).map((p) => p.price).filter((n) => typeof n === 'number');
    if (prices.length >= 2) out[ourKey] = prices;
  }
  return out;
}

export async function fetchSparklines(balances: TokenBalance[]): Promise<Record<TokenKey, number[]>> {
  const req = defiLlamaKeys(balances);
  if (req.llamaKeys.length === 0) return {};

  const chunks: string[][] = [];
  for (let i = 0; i < req.llamaKeys.length; i += CHUNK) {
    chunks.push(req.llamaKeys.slice(i, i + CHUNK));
  }

  const results = await Promise.allSettled(
    chunks.map(async (keys) => {
      const res = await fetch(`https://coins.llama.fi/chart/${keys.join(',')}?span=8&period=1d`);
      if (!res.ok) return null;
      return res.json();
    }),
  );

  const merged: Record<TokenKey, number[]> = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      Object.assign(merged, parseSparklines(r.value, req.byLlamaKey));
    }
  }
  return merged;
}
