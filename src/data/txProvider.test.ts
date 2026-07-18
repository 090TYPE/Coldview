import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchTransfers } from './txProvider';

afterEach(() => vi.restoreAllMocks());

describe('fetchTransfers', () => {
  it('merges token + native transfers and sorts by timestamp desc', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/token-transfers')) {
        return { ok: true, json: async () => ({ items: [
          { from: { hash: '0xa' }, to: { hash: '0xOWNER' }, token: { address: '0xUSDC', symbol: 'USDC', decimals: '6' }, total: { value: '1000000' }, tx_hash: '0xt1', timestamp: '2026-06-05T00:00:00Z' },
        ] }) } as Response;
      }
      return { ok: true, json: async () => ({ items: [
        { hash: '0xt2', from: { hash: '0xb' }, to: { hash: '0xOWNER' }, value: '1000000000000000000', timestamp: '2026-06-10T00:00:00Z' },
      ] }) } as Response;
    }));
    const out = await fetchTransfers('0xOWNER', 'ethereum');
    expect(out.map((t) => t.txHash)).toEqual(['0xt2', '0xt1']);
    expect(out.map((t) => t.symbol).sort()).toEqual(['ETH', 'USDC']);
  });
});
