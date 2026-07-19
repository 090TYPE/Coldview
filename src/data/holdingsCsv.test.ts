import { describe, it, expect } from 'vitest';
import { holdingsToCsv } from './holdingsCsv';
import type { Holding } from './types';

const h = (p: Partial<Holding>): Holding => ({
  key: 'ethereum:native', chainId: 'ethereum', symbol: 'ETH', amount: 2, priceUsd: 3000, valueUsd: 6000, change24hPct: 1.5, iconUrl: null, ...p,
});

describe('holdingsToCsv', () => {
  it('emits a header and one row per holding with chain name and numeric fields', () => {
    const csv = holdingsToCsv([h({}), h({ symbol: 'USDC', chainId: 'arbitrum', amount: 100, priceUsd: 1, valueUsd: 100 })]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('Asset,Chain,Balance,Price USD,Value USD,24h %');
    expect(lines[1]).toBe('ETH,Ethereum,2,3000,6000,1.5');
    expect(lines[2]).toBe('USDC,Arbitrum,100,1,100,1.5');
  });
  it('quotes a symbol containing a comma and renders null price/value as empty', () => {
    const csv = holdingsToCsv([h({ symbol: 'A,B', priceUsd: null, valueUsd: null, change24hPct: null })]);
    const row = csv.trim().split('\n')[1];
    expect(row).toBe('"A,B",Ethereum,2,,,');
  });
});
