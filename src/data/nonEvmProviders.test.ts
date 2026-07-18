import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSolanaBalances } from './solanaProvider';
import { fetchBitcoinBalance } from './bitcoinProvider';

afterEach(() => vi.restoreAllMocks());

describe('fetchSolanaBalances', () => {
  it('returns SOL + SPL balances from RPC', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      if (body.method === 'getBalance') {
        return { ok: true, json: async () => ({ result: { value: 2000000000 } }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({ result: { value: [
          { account: { data: { parsed: { info: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenAmount: { amount: '3120000', decimals: 6 } } } } } },
        ] } }),
      } as Response;
    }));
    const out = await fetchSolanaBalances('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs');
    expect(out.map((t) => t.symbol)).toEqual(['SOL', '']);
    expect(out.find((t) => t.contract)?.contract).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  it('still returns SOL when the token-accounts sub-call fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      if (body.method === 'getBalance') {
        return { ok: true, json: async () => ({ result: { value: 2000000000 } }) } as Response;
      }
      return { ok: false, status: 429, json: async () => ({}) } as Response; // token call rate-limited
    }));
    const out = await fetchSolanaBalances('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs');
    expect(out.map((t) => t.symbol)).toEqual(['SOL']);
  });
});

describe('fetchBitcoinBalance', () => {
  it('returns a single BTC balance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ chain_stats: { funded_txo_sum: 150000000, spent_txo_sum: 50000000 }, mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } }),
    } as Response)));
    const out = await fetchBitcoinBalance('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ symbol: 'BTC', rawBalance: '100000000' });
  });
});
