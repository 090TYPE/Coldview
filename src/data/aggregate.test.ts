import { describe, it, expect } from 'vitest';
import { aggregatePortfolio } from './aggregate';
import { keyOf } from './types';
import type { TokenBalance, Price, TokenKey } from './types';

const bal = (p: Partial<TokenBalance>): TokenBalance => ({
  chainId: 'arbitrum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '0', ...p,
});

const prices = (m: Record<string, Price>): Record<TokenKey, Price> => m;

describe('aggregatePortfolio', () => {
  it('computes value = amount * price and a total', () => {
    const balances = [bal({ chainId: 'arbitrum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' })];
    const snap = aggregatePortfolio(balances, prices({ [keyOf('arbitrum', null)]: { usd: 2000, change24hPct: 0 } }));
    expect(snap.totalValueUsd).toBeCloseTo(2000, 6);
    expect(snap.holdings[0].valueUsd).toBeCloseTo(2000, 6);
  });

  it('dedupes the same token across wallets by summing balances', () => {
    const c = '0xusdc';
    const balances = [
      bal({ chainId: 'arbitrum', contract: c, symbol: 'USDC', decimals: 6, rawBalance: '1000000' }),
      bal({ chainId: 'arbitrum', contract: c, symbol: 'USDC', decimals: 6, rawBalance: '2000000' }),
    ];
    const snap = aggregatePortfolio(balances, prices({ [keyOf('arbitrum', c)]: { usd: 1, change24hPct: 0 } }));
    expect(snap.holdings).toHaveLength(1);
    expect(snap.holdings[0].amount).toBeCloseTo(3, 6);
    expect(snap.totalValueUsd).toBeCloseTo(3, 6);
  });

  it('computes value-weighted 24h change', () => {
    const balances = [
      bal({ chainId: 'ethereum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' }),
      bal({ chainId: 'arbitrum', contract: '0xu', symbol: 'USDC', decimals: 6, rawBalance: '1000000' }),
    ];
    const snap = aggregatePortfolio(balances, prices({
      [keyOf('ethereum', null)]: { usd: 3000, change24hPct: 10 },
      [keyOf('arbitrum', '0xu')]: { usd: 1, change24hPct: 0 },
    }));
    expect(snap.change24hPct).toBeCloseTo(9.9967, 3);
  });

  it('builds byToken and byChain allocation percentages', () => {
    const balances = [
      bal({ chainId: 'ethereum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' }),
      bal({ chainId: 'arbitrum', contract: '0xu', symbol: 'USDC', decimals: 6, rawBalance: '1000000' }),
    ];
    const snap = aggregatePortfolio(balances, prices({
      [keyOf('ethereum', null)]: { usd: 3000, change24hPct: 0 },
      [keyOf('arbitrum', '0xu')]: { usd: 1000, change24hPct: 0 },
    }));
    const eth = snap.byToken.find((s) => s.label === 'ETH')!;
    expect(eth.pct).toBeCloseTo(75, 6);
    const arb = snap.byChain.find((s) => s.label === 'Arbitrum')!;
    expect(arb.pct).toBeCloseTo(25, 6);
  });

  it('drops dust and priceless tokens below the value threshold', () => {
    const balances = [
      bal({ chainId: 'base', contract: '0xspam', symbol: 'SPAM', decimals: 18, rawBalance: '1000000000000000000' }),
      bal({ chainId: 'base', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' }),
    ];
    const snap = aggregatePortfolio(
      balances,
      prices({ [keyOf('base', null)]: { usd: 2000, change24hPct: 0 } }),
      { minValueUsd: 0.01 },
    );
    expect(snap.holdings.map((h) => h.symbol)).toEqual(['ETH']);
    expect(snap.totalValueUsd).toBeCloseTo(2000, 6);
  });

  it('fills an empty token symbol from the price symbol, else a short mint', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const noName = 'So1111111111111111111111111111111111111112';
    const balances = [
      bal({ chainId: 'solana', contract: mint, symbol: '', decimals: 6, rawBalance: '1000000' }),
      bal({ chainId: 'solana', contract: noName, symbol: '', decimals: 0, rawBalance: '5' }),
    ];
    const snap = aggregatePortfolio(balances, prices({
      [keyOf('solana', mint)]: { usd: 1, change24hPct: 0, symbol: 'USDC' },
      [keyOf('solana', noName)]: { usd: 1, change24hPct: 0 },
    }));
    const bySym = Object.fromEntries(snap.holdings.map((h) => [h.key, h.symbol]));
    expect(bySym[keyOf('solana', mint)]).toBe('USDC');
    expect(bySym[keyOf('solana', noName)]).toBe('So11…1112');
  });
});
