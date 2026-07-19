import { describe, it, expect } from 'vitest';
import { computePnl } from './costBasis';
import { cacheKeyFor } from './historicalPrice';
import { keyOf } from './types';
import type { Holding, Transfer } from './types';

const DAY = 86400;
const KEY = keyOf('ethereum', null);

// ETH native transfer on a distinct day so each maps to its own historical price.
function ethT(direction: 'in' | 'out', amount: number, dayIdx: number, counterparty = '0xother'): Transfer {
  return {
    chainId: 'ethereum', txHash: `0x${dayIdx}${direction}`, timestamp: dayIdx * DAY + 100,
    direction, symbol: 'ETH', contract: null, decimals: 0, rawAmount: String(amount), counterparty, iconUrl: null,
  };
}

function priced(entries: [Transfer, number | undefined][]): { transfers: Transfer[]; map: Map<string, number> } {
  const map = new Map<string, number>();
  const transfers: Transfer[] = [];
  for (const [t, unit] of entries) {
    transfers.push(t);
    if (unit !== undefined) map.set(cacheKeyFor(t)!, unit);
  }
  return { transfers, map };
}

const hold = (amount: number, valueUsd: number): Holding => ({
  key: KEY, chainId: 'ethereum', symbol: 'ETH', amount, priceUsd: amount ? valueUsd / amount : 0, valueUsd, change24hPct: 0, iconUrl: null,
});

const NONE = new Set<string>();

describe('computePnl (FIFO)', () => {
  it('computes cost basis and unrealized P&L when history fully covers the balance', () => {
    const { transfers, map } = priced([[ethT('in', 1, 0), 1000], [ethT('in', 1, 1), 2000]]);
    const { rows } = computePnl(transfers, [hold(2, 6000)], map, NONE);
    expect(rows[0]).toMatchObject({ complete: true, realizedPnlUsd: 0, costBasisUsd: 3000, unrealizedPnlUsd: 3000 });
  });

  it('matches disposals FIFO for realized P&L and keeps the remaining lot as basis', () => {
    const { transfers, map } = priced([[ethT('in', 1, 0), 1000], [ethT('in', 1, 1), 2000], [ethT('out', 1, 2), 2500]]);
    const { rows, realizedTotalUsd, realizedEvents } = computePnl(transfers, [hold(1, 3000)], map, NONE);
    expect(rows[0]).toMatchObject({ complete: true, realizedPnlUsd: 1500, costBasisUsd: 2000, unrealizedPnlUsd: 1000 });
    expect(realizedTotalUsd).toBe(1500);
    // The sale is matched against the oldest lot (buy #0 @ $1000).
    expect(realizedEvents).toHaveLength(1);
    expect(realizedEvents[0]).toMatchObject({ symbol: 'ETH', amount: 1, proceedsUsd: 2500, costBasisUsd: 1000, gainUsd: 1500, acquiredTs: 0 * 86400 + 100 });
  });

  it('withholds cost basis when tracked buys do not add up to the current balance', () => {
    const { transfers, map } = priced([[ethT('in', 1, 0), 1000]]);
    const { rows, hasPartial } = computePnl(transfers, [hold(3, 9000)], map, NONE);
    expect(rows[0]).toMatchObject({ complete: false, costBasisUsd: null, unrealizedPnlUsd: null });
    expect(hasPartial).toBe(true);
  });

  it('flags a row incomplete when a disposal cannot be matched (oversold)', () => {
    const { transfers, map } = priced([[ethT('out', 1, 0), 2500]]);
    const { rows } = computePnl(transfers, [hold(5, 15000)], map, NONE);
    expect(rows[0].complete).toBe(false);
  });

  it('withholds cost basis when a historical price is missing', () => {
    const { transfers, map } = priced([[ethT('in', 1, 0), undefined], [ethT('in', 1, 1), 2000]]);
    const { rows } = computePnl(transfers, [hold(2, 6000)], map, NONE);
    expect(rows[0]).toMatchObject({ complete: false, costBasisUsd: null });
  });

  it('ignores transfers between the user’s own wallets', () => {
    const { transfers, map } = priced([[ethT('in', 1, 0, '0xme'), 1000]]);
    const { rows } = computePnl(transfers, [hold(1, 3000)], map, new Set(['0xme']));
    // The self-transfer created no lot, so tracked history is empty -> incomplete.
    expect(rows[0]).toMatchObject({ complete: false, realizedPnlUsd: 0, costBasisUsd: null });
  });

  it('reports realized P&L for a token that has been fully sold', () => {
    const { transfers, map } = priced([[ethT('in', 1, 0), 1000], [ethT('out', 1, 1), 3000]]);
    const { rows, realizedTotalUsd } = computePnl(transfers, [], map, NONE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ currentAmount: 0, realizedPnlUsd: 2000 });
    expect(realizedTotalUsd).toBe(2000);
  });
});
