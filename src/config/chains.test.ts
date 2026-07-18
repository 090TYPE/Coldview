import { describe, it, expect } from 'vitest';
import { CHAINS, getChain } from './chains';

describe('chain registry', () => {
  it('includes the five EVM chains plus Solana and Bitcoin', () => {
    expect(CHAINS.map((c) => c.id)).toEqual([
      'ethereum', 'arbitrum', 'base', 'polygon', 'optimism', 'solana', 'bitcoin',
    ]);
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
