import { describe, it, expect, vi, afterEach } from 'vitest';
import { llamaKey, cacheKeyFor, hydrateHistoricalUsd } from './historicalPrice';
import type { Transfer } from './types';

afterEach(() => vi.restoreAllMocks());

const tf = (p: Partial<Transfer>): Transfer => ({
  chainId: 'ethereum', txHash: '0x', timestamp: 1_717_200_000, direction: 'in',
  symbol: 'USDC', contract: '0xusdc', decimals: 6, rawAmount: '0', counterparty: '0xx', ...p,
});

describe('llamaKey', () => {
  it('maps native by coingecko id and token by chain:contract', () => {
    expect(llamaKey('ethereum', null, 'ETH')).toBe('coingecko:ethereum');
    expect(llamaKey('ethereum', '0xUSDC', 'USDC')).toBe('ethereum:0xusdc');
  });
});

describe('cacheKeyFor', () => {
  it('floors the timestamp to the day', () => {
    const t = tf({ timestamp: 1_717_200_123 });
    const day = Math.floor(1_717_200_123 / 86400) * 86400;
    expect(cacheKeyFor(t)).toBe(`ethereum:0xusdc@${day}`);
  });
});

describe('hydrateHistoricalUsd', () => {
  it('fetches a missing price, caches it, and de-dupes repeat (key,day)', async () => {
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ coins: { 'ethereum:0xusdc': { price: 1 } } }),
    } as Response));
    vi.stubGlobal('fetch', fetchMock);
    const day = 1_717_200_000;
    const transfers = [tf({ timestamp: day + 5 }), tf({ timestamp: day + 9 })];
    const map = await hydrateHistoricalUsd(transfers);
    expect(map.get(cacheKeyFor(transfers[0])!)).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
