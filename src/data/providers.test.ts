import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchBalances } from './balanceProvider';
import { fetchPrices } from './priceProvider';
import { keyOf } from './types';
import type { TokenBalance } from './types';

afterEach(() => vi.restoreAllMocks());

describe('fetchBalances (Blockscout)', () => {
  it('fetches token + native balances for an address on a chain', async () => {
    const tokenJson = [{ token: { address: '0xArb', symbol: 'ARB', decimals: '18', type: 'ERC-20' }, value: '1000000000000000000' }];
    const coinJson = { coin_balance: '2000000000000000000' };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const body = url.includes('/token-balances') ? tokenJson : coinJson;
      return { ok: true, json: async () => body } as Response;
    }));
    const out = await fetchBalances('0xabc', 'arbitrum');
    const symbols = out.map((t: TokenBalance) => t.symbol).sort();
    expect(symbols).toEqual(['ARB', 'ETH']);
  });
});

describe('fetchPrices (DefiLlama)', () => {
  it('returns a price map for the given balances', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ coins: { 'arbitrum:0xarb': { price: 1.26 } } }),
    } as Response)));
    const prices = await fetchPrices([
      { chainId: 'arbitrum', contract: '0xARB', symbol: 'ARB', decimals: 18, rawBalance: '1' },
    ]);
    expect(prices[keyOf('arbitrum', '0xARB')].usd).toBe(1.26);
  });
});
