import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useActivity } from './useActivity';
import type { Wallet } from '../data/walletStore';

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useActivity', () => {
  it('loads EVM transfers with historical USD', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/token-transfers')) {
        return { ok: true, json: async () => ({ items: [
          { from: { hash: '0xa' }, to: { hash: '0x' + 'a'.repeat(40) }, token: { address: '0xUSDC', symbol: 'USDC', decimals: '6' }, total: { value: '1000000' }, tx_hash: '0xt1', timestamp: '2026-06-01T00:00:00Z' },
        ] }) } as Response;
      }
      if (url.includes('/transactions')) {
        return { ok: true, json: async () => ({ items: [] }) } as Response;
      }
      return { ok: true, json: async () => ({ coins: { 'ethereum:0xusdc': { price: 1 } } }) } as Response;
    }));

    const wallets: Wallet[] = [{ address: '0x' + 'a'.repeat(40), label: 'Main', family: 'evm' }];
    const { result } = renderHook(() => useActivity(wallets, ['ethereum'], true), { wrapper });
    await waitFor(() => expect(result.current.data?.length).toBe(1));
    expect(result.current.data![0]).toMatchObject({ symbol: 'USDC', direction: 'in', usdAtTime: 1 });
  });
});
