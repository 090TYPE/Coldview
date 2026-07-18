import { get, set } from 'idb-keyval';
import type { ChainId, Transfer } from './types';

const NATIVE_CG: Record<string, string> = { ETH: 'ethereum', POL: 'matic-network', SOL: 'solana', BTC: 'bitcoin' };
const DAY = 86400;

export function llamaKey(chainId: ChainId, contract: string | null, symbol: string): string | null {
  if (contract === null) {
    const cg = NATIVE_CG[symbol];
    return cg ? `coingecko:${cg}` : null;
  }
  if (chainId === 'solana') return `solana:${contract}`;
  return `${chainId}:${contract.toLowerCase()}`;
}

export function cacheKeyFor(t: Transfer): string | null {
  const k = llamaKey(t.chainId, t.contract, t.symbol);
  if (!k) return null;
  const day = Math.floor(t.timestamp / DAY) * DAY;
  return `${k}@${day}`;
}

async function fetchHistorical(llamaK: string, unixTs: number): Promise<number | null> {
  const res = await fetch(`https://coins.llama.fi/prices/historical/${unixTs}/${llamaK}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { coins?: Record<string, { price?: number }> };
  const p = data.coins?.[llamaK]?.price;
  return typeof p === 'number' ? p : null;
}

// Returns Map<cacheKeyFor(t), unit USD price>. Only found prices are present.
// Historical prices are immutable so cache them permanently in IndexedDB.
export async function hydrateHistoricalUsd(transfers: Transfer[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const need = new Map<string, { llamaK: string; unixTs: number }>();
  for (const t of transfers) {
    const ck = cacheKeyFor(t);
    if (!ck || need.has(ck)) continue;
    const llamaK = llamaKey(t.chainId, t.contract, t.symbol)!;
    need.set(ck, { llamaK, unixTs: Math.floor(t.timestamp / DAY) * DAY });
  }
  for (const [ck, { llamaK, unixTs }] of need) {
    const cached = await get<number>(`hist:${ck}`);
    if (typeof cached === 'number') {
      result.set(ck, cached);
      continue;
    }
    const price = await fetchHistorical(llamaK, unixTs);
    if (price !== null) {
      await set(`hist:${ck}`, price);
      result.set(ck, price);
    }
  }
  return result;
}
