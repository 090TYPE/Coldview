import { describe, it, expect } from 'vitest';
import { CHAINS, getChain } from './chains';

describe('chain registry', () => {
  it('includes the five Phase 1 chains', () => {
    expect(CHAINS.map((c) => c.id)).toEqual([
      'ethereum', 'arbitrum', 'base', 'polygon', 'optimism',
    ]);
  });
  it('every chain has a Blockscout base URL and native symbol', () => {
    for (const c of CHAINS) {
      expect(c.blockscoutBaseUrl).toMatch(/^https:\/\//);
      expect(c.nativeSymbol.length).toBeGreaterThan(0);
    }
  });
  it('getChain returns a chain by id', () => {
    expect(getChain('base').name).toBe('Base');
  });
});
