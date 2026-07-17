import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/defillama-prices.json';
import { defiLlamaKeys, parseDefiLlamaPrices } from './parseDefiLlama';
import { keyOf } from './types';
import type { TokenBalance } from './types';

const bal = (p: Partial<TokenBalance>): TokenBalance => ({
  chainId: 'arbitrum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '0', ...p,
});

describe('defiLlamaKeys', () => {
  it('maps native coins to coingecko ids and ERC-20 to chain:address', () => {
    const req = defiLlamaKeys([
      bal({ chainId: 'arbitrum', contract: null, symbol: 'ETH' }),
      bal({ chainId: 'arbitrum', contract: '0xARB', symbol: 'ARB' }),
    ]);
    expect(req.llamaKeys).toContain('coingecko:ethereum');
    expect(req.llamaKeys).toContain('arbitrum:0xarb');
    expect(req.byLlamaKey['arbitrum:0xarb']).toBe(keyOf('arbitrum', '0xARB'));
  });
});

describe('parseDefiLlamaPrices', () => {
  it('produces a price map keyed by our TokenKey', () => {
    const req = defiLlamaKeys([bal({ chainId: 'arbitrum', contract: '0xusdc', symbol: 'USDC', decimals: 6 })]);
    const prices = parseDefiLlamaPrices(fixture, req.byLlamaKey);
    expect(prices[keyOf('arbitrum', '0xusdc')].usd).toBe(1.0);
  });
});
