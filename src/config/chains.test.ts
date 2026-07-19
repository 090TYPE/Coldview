import { describe, it, expect } from 'vitest';
import { CHAINS, getChain } from './chains';

describe('chain registry', () => {
  it('includes the EVM chains plus Solana and Bitcoin', () => {
    expect(CHAINS.map((c) => c.id)).toEqual([
      'ethereum', 'arbitrum', 'base', 'polygon', 'optimism',
      'zksync', 'scroll', 'gnosis', 'celo',
      'solana', 'bitcoin',
    ]);
  });
  it('every EVM chain resolves a native price (DefiLlama coingecko id)', () => {
    // Guards against adding a chain whose native symbol lacks a price mapping.
    const priced = new Set(['ETH', 'POL', 'XDAI', 'CELO']);
    for (const c of CHAINS.filter((x) => x.family === 'evm')) {
      expect(priced.has(c.nativeSymbol)).toBe(true);
    }
  });
  it('tags each chain with a family', () => {
    expect(getChain('ethereum').family).toBe('evm');
    expect(getChain('solana').family).toBe('solana');
    expect(getChain('bitcoin').family).toBe('bitcoin');
  });
  it('EVM chains keep a Blockscout URL; Solana has an rpcUrl; Bitcoin has an esploraBaseUrl', () => {
    expect(getChain('base').blockscoutBaseUrl).toMatch(/^https:\/\//);
    expect(getChain('solana').rpcUrl).toMatch(/^https:\/\//);
    expect(getChain('bitcoin').esploraBaseUrl).toMatch(/^https:\/\//);
  });
});
