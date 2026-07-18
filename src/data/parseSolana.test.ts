import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/solana-accounts.json';
import { parseSolanaTokenAccounts, solanaNativeBalance } from './parseSolana';

describe('parseSolanaTokenAccounts', () => {
  it('normalizes SPL token accounts and skips zero balances; symbol is empty (filled later)', () => {
    const out = parseSolanaTokenAccounts(fixture);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      chainId: 'solana',
      contract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: '',
      decimals: 6,
      rawBalance: '3120000',
    });
  });
});

describe('solanaNativeBalance', () => {
  it('builds a SOL TokenBalance from lamports', () => {
    expect(solanaNativeBalance(1500000000)).toEqual({
      chainId: 'solana', contract: null, symbol: 'SOL', decimals: 9, rawBalance: '1500000000',
    });
  });
  it('returns null for a zero SOL balance', () => {
    expect(solanaNativeBalance(0)).toBeNull();
  });
});
