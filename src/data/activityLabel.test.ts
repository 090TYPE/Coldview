import { describe, it, expect } from 'vitest';
import { buildTxKinds, activityLabel } from './activity';
import type { Transfer } from './types';

const t = (p: Partial<Transfer>): Transfer => ({
  chainId: 'ethereum', txHash: '0x1', timestamp: 0, direction: 'in', symbol: 'ETH',
  contract: null, decimals: 18, rawAmount: '0', counterparty: '0xother', ...p,
});

describe('activityLabel', () => {
  it('labels a tx with both in and out as a swap', () => {
    const rows = [t({ txHash: '0xs', direction: 'in', symbol: 'USDC' }), t({ txHash: '0xs', direction: 'out', symbol: 'ETH' })];
    const kinds = buildTxKinds(rows);
    expect(activityLabel(rows[0], kinds, new Set())).toBe('swap');
    expect(activityLabel(rows[1], kinds, new Set())).toBe('swap');
  });

  it('labels plain in/out as receive/send', () => {
    const rows = [t({ txHash: '0xa', direction: 'in' }), t({ txHash: '0xb', direction: 'out' })];
    const kinds = buildTxKinds(rows);
    expect(activityLabel(rows[0], kinds, new Set())).toBe('receive');
    expect(activityLabel(rows[1], kinds, new Set())).toBe('send');
  });

  it('labels a transfer to your own wallet as self', () => {
    const row = t({ txHash: '0xc', direction: 'out', counterparty: '0xme' });
    expect(activityLabel(row, buildTxKinds([row]), new Set(['0xme']))).toBe('self');
  });
});
