import { describe, it, expect } from 'vitest';
import tokenFixture from '../../tests/fixtures/blockscout-token-transfers.json';
import txFixture from '../../tests/fixtures/blockscout-transactions.json';
import { parseTokenTransfers, parseNativeTxs } from './parseTransfers';

const OWNER = '0xOWNER00000000000000000000000000000000000';

describe('parseTokenTransfers', () => {
  it('normalizes transfers with correct direction and counterparty', () => {
    const out = parseTokenTransfers(tokenFixture, 'ethereum', OWNER);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      chainId: 'ethereum', txHash: '0xtx1', direction: 'in', symbol: 'USDC',
      contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, rawAmount: '3120000',
      counterparty: '0xsender0000000000000000000000000000000001',
    });
    expect(out[1]).toMatchObject({ direction: 'out', counterparty: '0xreceiver000000000000000000000000000000002' });
    expect(out[0].timestamp).toBe(Math.floor(Date.parse('2026-06-01T10:00:00Z') / 1000));
  });

  it('carries the token icon_url onto the transfer', () => {
    const out = parseTokenTransfers(tokenFixture, 'ethereum', OWNER);
    expect(out[0].iconUrl).toBe('https://assets.example/usdc.png');
    expect(out[1].iconUrl).toBeNull(); // second transfer has no icon_url in the fixture
  });
});

describe('parseNativeTxs', () => {
  it('keeps value-bearing native txs and skips zero-value calls', () => {
    const out = parseNativeTxs(txFixture, 'ethereum', OWNER, 'ETH');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ txHash: '0xtx3', direction: 'in', symbol: 'ETH', contract: null, decimals: 18, rawAmount: '1000000000000000000', iconUrl: null });
  });
});
