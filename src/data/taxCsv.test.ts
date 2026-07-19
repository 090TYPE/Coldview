import { describe, it, expect } from 'vitest';
import { realizedEventsToCsv } from './taxCsv';
import type { RealizedEvent } from './costBasis';

describe('realizedEventsToCsv', () => {
  it('emits a header and one row per realized event with a holding term', () => {
    const ev: RealizedEvent = {
      disposedTs: 1717200000, acquiredTs: 1685664000, symbol: 'ETH', chainId: 'ethereum',
      amount: 1, proceedsUsd: 3000, costBasisUsd: 1000.005, gainUsd: 1999.995,
    };
    const csv = realizedEventsToCsv([ev]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('Disposed,Asset,Chain,Amount,Proceeds USD,Cost basis USD,Gain USD,Acquired,Term');
    expect(lines[1]).toBe('2024-06-01,ETH,Ethereum,1,3000,1000.01,2000,2023-06-02,long'); // exactly 365d apart -> long
  });
});
