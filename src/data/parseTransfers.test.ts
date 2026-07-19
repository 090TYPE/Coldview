import { describe, it, expect } from 'vitest';
import tokenFixture from '../../tests/fixtures/blockscout-token-transfers.json';
import txFixture from '../../tests/fixtures/blockscout-transactions.json';
import { parseTokenTransfers, parseNativeTxs, parseBitcoinTxs, parseSolanaNativeTransfer } from './parseTransfers';

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

describe('parseBitcoinTxs', () => {
  const OWNER = 'bc1qowner';
  it('nets received-minus-spent per tx, setting direction and counterparty', () => {
    const raw = [
      { txid: 'btc1', status: { block_time: 1717200000 },
        vin: [{ prevout: { scriptpubkey_address: 'bc1qalice', value: 60000000 } }],
        vout: [{ scriptpubkey_address: OWNER, value: 50000000 }, { scriptpubkey_address: 'bc1qalice', value: 9990000 }] },
      { txid: 'btc2', status: { block_time: 1717100000 },
        vin: [{ prevout: { scriptpubkey_address: OWNER, value: 50000000 } }],
        vout: [{ scriptpubkey_address: 'bc1qbob', value: 20000000 }, { scriptpubkey_address: OWNER, value: 29990000 }] },
    ];
    const out = parseBitcoinTxs(raw, OWNER);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ chainId: 'bitcoin', txHash: 'btc1', direction: 'in', symbol: 'BTC', decimals: 8, rawAmount: '50000000', counterparty: 'bc1qalice' });
    expect(out[1]).toMatchObject({ txHash: 'btc2', direction: 'out', rawAmount: '20010000', counterparty: 'bc1qbob' });
  });
});

describe('parseSolanaNativeTransfer', () => {
  const OWNER = 'So1anaOwnerPubkey';
  it('nets the owner lamport delta into a SOL transfer', () => {
    const raw = { blockTime: 1717200000, transaction: { message: { accountKeys: ['OtherKey', OWNER] } }, meta: { preBalances: [10, 1000000000], postBalances: [10, 3000000000] } };
    const t = parseSolanaNativeTransfer(raw, OWNER, 'sig1')!;
    expect(t).toMatchObject({ chainId: 'solana', txHash: 'sig1', direction: 'in', symbol: 'SOL', decimals: 9, rawAmount: '2000000000' });
  });
  it('returns null when the owner is absent or the delta is zero', () => {
    expect(parseSolanaNativeTransfer({ transaction: { message: { accountKeys: ['x'] } }, meta: { preBalances: [1], postBalances: [1] } }, OWNER, 's')).toBeNull();
    expect(parseSolanaNativeTransfer({ transaction: { message: { accountKeys: [OWNER] } }, meta: { preBalances: [5], postBalances: [5] } }, OWNER, 's')).toBeNull();
  });
});
