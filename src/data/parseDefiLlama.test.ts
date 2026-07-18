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

import { defiLlamaKeys as keys2, parseDefiLlamaPrices as parse2 } from './parseDefiLlama';
import { keyOf as keyOf2 } from './types';

describe('DefiLlama Solana/Bitcoin support', () => {
  it('maps SOL and BTC natives to coingecko ids', () => {
    const req = keys2([
      { chainId: 'solana', contract: null, symbol: 'SOL', decimals: 9, rawBalance: '1' },
      { chainId: 'bitcoin', contract: null, symbol: 'BTC', decimals: 8, rawBalance: '1' },
    ]);
    expect(req.llamaKeys).toContain('coingecko:solana');
    expect(req.llamaKeys).toContain('coingecko:bitcoin');
  });

  it('keeps SPL mint case exact in the outgoing key', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const req = keys2([{ chainId: 'solana', contract: mint, symbol: '', decimals: 6, rawBalance: '1' }]);
    expect(req.llamaKeys).toContain(`solana:${mint}`);
    expect(req.byLlamaKey[`solana:${mint}`]).toBe(keyOf2('solana', mint));
  });

  it('reads the symbol from the DefiLlama response', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const req = keys2([{ chainId: 'solana', contract: mint, symbol: '', decimals: 6, rawBalance: '1' }]);
    const prices = parse2({ coins: { [`solana:${mint}`]: { price: 1.0, symbol: 'USDC' } } }, req.byLlamaKey);
    const p = prices[keyOf2('solana', mint)];
    expect(p.usd).toBe(1.0);
    expect(p.symbol).toBe('USDC');
  });
});
