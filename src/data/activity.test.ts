import { describe, it, expect } from 'vitest';
import { buildActivity, computeRecentFlows } from './activity';
import { cacheKeyFor } from './historicalPrice';
import type { Transfer } from './types';

const tf = (p: Partial<Transfer>): Transfer => ({
  chainId: 'ethereum', txHash: '0x', timestamp: 1_717_200_000, direction: 'in',
  symbol: 'ETH', contract: null, decimals: 18, rawAmount: '1000000000000000000', counterparty: '0xother', ...p,
});

describe('buildActivity', () => {
  it('attaches usdAtTime = amount * unit price, or null when missing', () => {
    const t = tf({});
    const map = new Map<string, number>([[cacheKeyFor(t)!, 3000]]);
    const [row] = buildActivity([t], map);
    expect(row.usdAtTime).toBeCloseTo(3000, 6);
    const t2 = tf({ symbol: 'ZZZ', contract: '0xzzz' });
    const [row2] = buildActivity([t2], new Map());
    expect(row2.usdAtTime).toBeNull();
  });
});

describe('computeRecentFlows', () => {
  it('sums in/out per token, excludes self-transfers and priceless rows', () => {
    const rows = [
      { ...tf({ direction: 'in' }), usdAtTime: 1000 },
      { ...tf({ direction: 'out' }), usdAtTime: 400 },
      { ...tf({ direction: 'in', counterparty: '0xmine' }), usdAtTime: 5000 }, // self-transfer, excluded
      { ...tf({ direction: 'in' }), usdAtTime: null }, // priceless, excluded
    ];
    const flows = computeRecentFlows(rows, new Set<string>(['0xmine']));
    const eth = flows.perToken.find((r) => r.symbol === 'ETH')!;
    expect(eth.inUsd).toBeCloseTo(1000, 6);
    expect(eth.outUsd).toBeCloseTo(400, 6);
    expect(eth.netUsd).toBeCloseTo(600, 6);
    expect(flows.totalIn).toBeCloseTo(1000, 6);
    expect(flows.totalOut).toBeCloseTo(400, 6);
    expect(flows.totalNet).toBeCloseTo(600, 6);
  });
});
