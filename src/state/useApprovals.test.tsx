import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useApprovals } from './useApprovals';
import { APPROVAL_TOPIC0 } from '../data/approvalsProvider';
import type { Wallet } from '../data/walletStore';

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const OWNER = '0x' + 'a'.repeat(40);
const OWNER_TOPIC = '0x' + '0'.repeat(24) + 'a'.repeat(40);
const SPENDER_TOPIC = '0x' + '0'.repeat(24) + 'b'.repeat(40);

describe('useApprovals', () => {
  it('loads and flattens active approvals for EVM wallets', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ message: 'OK', result: [
        { address: '0x' + 'd'.repeat(40), data: '0x' + 'f'.repeat(64),
          blockNumber: '0xa', transactionHash: '0x' + 'e'.repeat(64),
          topics: [APPROVAL_TOPIC0, OWNER_TOPIC, SPENDER_TOPIC, null] },
      ] }),
    } as Response)));

    const wallets: Wallet[] = [{ address: OWNER, label: 'Main', family: 'evm' }];
    const { result } = renderHook(() => useApprovals(wallets, ['ethereum'], true), { wrapper });
    await waitFor(() => expect(result.current.data?.length).toBe(1));
    expect(result.current.data![0]).toMatchObject({
      chainId: 'ethereum', amount: null, spender: '0x' + 'b'.repeat(40),
    });
  });

  it('is disabled with no wallets', () => {
    const { result } = renderHook(() => useApprovals([], ['ethereum'], true), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
