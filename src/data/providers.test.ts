import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchBalances } from './balanceProvider';
import { fetchPrices } from './priceProvider';
import { keyOf } from './types';
import type { TokenBalance } from './types';

afterEach(() => vi.restoreAllMocks());

describe('fetchBalances (Blockscout)', () => {
  it('fetches token + native balances for an address on a chain', async () => {
    const tokenJson = [{ token: { address_hash: '0xArb', symbol: 'ARB', decimals: '18', type: 'ERC-20', exchange_rate: '1.26' }, value: '1000000000000000000' }];
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

  it('chunks large key sets so one oversized URL cannot drop every price', async () => {
    const balances = Array.from({ length: 120 }, (_, i) => ({
      chainId: 'ethereum' as const,
      contract: '0x' + i.toString(16).padStart(40, '0'),
      symbol: 'T' + i,
      decimals: 18,
      rawBalance: '1',
    }));
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      const firstKey = url.split('/current/')[1].split(',')[0];
      return { ok: true, json: async () => ({ coins: { [firstKey]: { price: 2 } } }) } as Response;
    }));
    const prices = await fetchPrices(balances);
    expect(calls.length).toBeGreaterThan(1); // 120 keys -> multiple 50-key chunks
    expect(Object.keys(prices).length).toBe(calls.length); // one price merged per chunk
  });
});

describe('fetchBalances dispatch', () => {
  it('routes a bitcoin chain to the esplora provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ chain_stats: { funded_txo_sum: 100000000, spent_txo_sum: 0 }, mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } }),
    } as Response)));
    const out = await fetchBalances('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'bitcoin');
    expect(out[0].symbol).toBe('BTC');
  });
});
