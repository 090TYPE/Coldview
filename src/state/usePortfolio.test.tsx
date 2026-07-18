import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePortfolio } from './usePortfolio';
import type { Wallet } from '../data/walletStore';

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('usePortfolio', () => {
  it('aggregates balances and prices into a snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/token-balances')) {
        return { ok: true, json: async () => ([{ token: { address: '0xARB', symbol: 'ARB', decimals: '18', type: 'ERC-20' }, value: '1000000000000000000' }]) } as Response;
      }
      if (url.includes('coins.llama.fi')) {
        return { ok: true, json: async () => ({ coins: { 'arbitrum:0xarb': { price: 2 } } }) } as Response;
      }
      return { ok: true, json: async () => ({ coin_balance: '0' }) } as Response;
    }));

    const wallets: Wallet[] = [{ address: '0x' + 'a'.repeat(40), label: 'Main', family: 'evm' }];
    const { result } = renderHook(() => usePortfolio(wallets, ['arbitrum']), { wrapper });

    await waitFor(() => expect(result.current.data?.totalValueUsd).toBeCloseTo(2, 6));
    expect(result.current.data?.holdings[0].symbol).toBe('ARB');
  });
});
