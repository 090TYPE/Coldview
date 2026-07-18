import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/blockscout-arbitrum.json';
import { parseBlockscoutBalances, nativeBalance } from './parseBlockscout';

describe('parseBlockscoutBalances', () => {
  it('normalizes priced ERC-20 tokens (via address_hash), skips zero balances and spam without a market rate', () => {
    const out = parseBlockscoutBalances(fixture, 'arbitrum');
    // SPAM has no exchange_rate and ZERO has a zero balance -> both dropped.
    expect(out.map((t) => t.symbol)).toEqual(['USDC', 'ARB']);
    const usdc = out[0];
    expect(usdc).toMatchObject({ chainId: 'arbitrum', contract: '0xusdc', decimals: 6, rawBalance: '3120000000', iconUrl: 'https://assets.example/usdc.png' });
    expect(out[1].iconUrl).toBeNull(); // ARB has no icon_url -> null
  });
});

describe('nativeBalance', () => {
  it('builds a native TokenBalance from a coin-balance value', () => {
    const t = nativeBalance('1500000000000000000', 'ethereum', 'ETH');
    expect(t).toEqual({ chainId: 'ethereum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1500000000000000000' });
  });
});
