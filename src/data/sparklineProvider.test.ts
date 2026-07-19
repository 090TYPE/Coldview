import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseSparklines, fetchSparklines } from './sparklineProvider';
import { keyOf } from './types';
import type { TokenBalance } from './types';

afterEach(() => vi.restoreAllMocks());

describe('parseSparklines', () => {
  it('maps llama keys back to token keys and extracts the price series', () => {
    const byLlamaKey = { 'coingecko:ethereum': keyOf('ethereum', null) };
    const out = parseSparklines(
      { coins: { 'coingecko:ethereum': { prices: [{ timestamp: 1, price: 10 }, { timestamp: 2, price: 12 }] } } },
      byLlamaKey,
    );
    expect(out[keyOf('ethereum', null)]).toEqual([10, 12]);
  });

  it('drops a series with fewer than two points', () => {
    const byLlamaKey = { 'coingecko:ethereum': keyOf('ethereum', null) };
    const out = parseSparklines(
      { coins: { 'coingecko:ethereum': { prices: [{ timestamp: 1, price: 10 }] } } },
      byLlamaKey,
    );
    expect(out[keyOf('ethereum', null)]).toBeUndefined();
  });
});

describe('fetchSparklines', () => {
  it('fetches the chart endpoint and returns series keyed by token key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ coins: { 'coingecko:ethereum': { prices: [{ timestamp: 1, price: 10 }, { timestamp: 2, price: 12 }] } } }),
      } as Response)),
    );
    const balances: TokenBalance[] = [{ chainId: 'ethereum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '0' }];
    const out = await fetchSparklines(balances);
    expect(out[keyOf('ethereum', null)]).toEqual([10, 12]);
  });

  it('returns {} when there are no priceable balances', async () => {
    expect(await fetchSparklines([])).toEqual({});
  });
});
