import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/esplora-address.json';
import { parseEsploraBalance } from './parseEsplora';

describe('parseEsploraBalance', () => {
  it('computes BTC balance in sats from funded minus spent (chain + mempool)', () => {
    const out = parseEsploraBalance(fixture);
    expect(out).toEqual({
      chainId: 'bitcoin', contract: null, symbol: 'BTC', decimals: 8, rawBalance: '100000000',
    });
  });
  it('returns null for a zero balance', () => {
    const zero = { chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0 }, mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } };
    expect(parseEsploraBalance(zero)).toBeNull();
  });
});
