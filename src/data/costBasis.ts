import { keyOf, toAmount } from './types';
import { cacheKeyFor } from './historicalPrice';
import type { ChainId, Holding, Transfer, TokenKey } from './types';

export interface PnlRow {
  key: TokenKey;
  chainId: ChainId;
  symbol: string;
  currentAmount: number;
  currentValueUsd: number | null;
  realizedPnlUsd: number;
  costBasisUsd: number | null;    // remaining lots' cost; null when coverage is partial
  unrealizedPnlUsd: number | null;
  complete: boolean;              // tracked history fully explains the current balance
}

export interface PnlSummary {
  rows: PnlRow[];
  realizedTotalUsd: number;
  unrealizedTotalUsd: number;     // sum over complete rows only
  hasPartial: boolean;
}

interface Lot {
  amount: number;
  unit: number | null; // USD unit cost at acquisition; null when price unknown
}

// FIFO cost-basis P&L. Honest about coverage: Blockscout only returns a bounded
// slice of history, so if the tracked buys don't add up to the current balance
// (or a disposal can't be matched, or a historical price is missing), the row is
// flagged incomplete and its cost basis / unrealized P&L are withheld (null)
// rather than fabricated. Realized P&L from matched disposals is always shown.
export function computePnl(
  transfers: Transfer[],
  holdings: Holding[],
  historicalUsd: Map<string, number>,
  owned: Set<string>,
): PnlSummary {
  const byKey = new Map<TokenKey, Transfer[]>();
  for (const t of transfers) {
    if (owned.has(t.counterparty)) continue; // moving between your own wallets isn't a trade
    const k = keyOf(t.chainId, t.contract);
    const list = byKey.get(k);
    if (list) list.push(t);
    else byKey.set(k, [t]);
  }

  const holdingByKey = new Map(holdings.map((h) => [h.key, h]));
  const rows: PnlRow[] = [];

  for (const h of holdings) {
    const ts = (byKey.get(h.key) ?? []).slice().sort((a, b) => a.timestamp - b.timestamp);
    const lots: Lot[] = [];
    let realized = 0;
    let inAmount = 0;
    let outAmount = 0;
    let unknownUnit = false;
    let oversold = false;

    for (const t of ts) {
      const ck = cacheKeyFor(t);
      const unit = ck ? historicalUsd.get(ck) ?? null : null;
      const amt = toAmount(t.rawAmount, t.decimals);
      if (unit === null) unknownUnit = true;

      if (t.direction === 'in') {
        inAmount += amt;
        lots.push({ amount: amt, unit });
      } else {
        outAmount += amt;
        let remaining = amt;
        while (remaining > 1e-12 && lots.length > 0) {
          const lot = lots[0];
          const take = Math.min(remaining, lot.amount);
          if (unit !== null && lot.unit !== null) realized += (unit - lot.unit) * take;
          lot.amount -= take;
          remaining -= take;
          if (lot.amount <= 1e-12) lots.shift();
        }
        if (remaining > 1e-9) oversold = true; // disposed more than we ever saw acquired
      }
    }

    const trackedNet = inAmount - outAmount;
    const currentAmount = h.amount;
    const balanceMatches = Math.abs(trackedNet - currentAmount) <= Math.max(1e-9, currentAmount * 0.005);
    const complete = balanceMatches && !oversold && !unknownUnit;

    const remainingCost = lots.reduce((s, l) => s + l.amount * (l.unit ?? 0), 0);
    const costBasisUsd = complete ? remainingCost : null;
    const currentValueUsd = h.valueUsd;
    const unrealizedPnlUsd =
      complete && currentValueUsd !== null ? currentValueUsd - remainingCost : null;

    rows.push({
      key: h.key,
      chainId: h.chainId,
      symbol: h.symbol,
      currentAmount,
      currentValueUsd,
      realizedPnlUsd: realized,
      costBasisUsd,
      unrealizedPnlUsd,
      complete,
    });
  }

  // Realized P&L can also come from tokens fully sold (no current holding).
  for (const [key, ts] of byKey) {
    if (holdingByKey.has(key)) continue;
    const sorted = ts.slice().sort((a, b) => a.timestamp - b.timestamp);
    const lots: Lot[] = [];
    let realized = 0;
    let unknownUnit = false;
    let oversold = false;
    let symbol = '';
    const chainId = sorted[0]?.chainId ?? 'ethereum';
    for (const t of sorted) {
      symbol = t.symbol || symbol;
      const ck = cacheKeyFor(t);
      const unit = ck ? historicalUsd.get(ck) ?? null : null;
      const amt = toAmount(t.rawAmount, t.decimals);
      if (unit === null) unknownUnit = true;
      if (t.direction === 'in') {
        lots.push({ amount: amt, unit });
      } else {
        let remaining = amt;
        while (remaining > 1e-12 && lots.length > 0) {
          const lot = lots[0];
          const take = Math.min(remaining, lot.amount);
          if (unit !== null && lot.unit !== null) realized += (unit - lot.unit) * take;
          lot.amount -= take;
          remaining -= take;
          if (lot.amount <= 1e-12) lots.shift();
        }
        if (remaining > 1e-9) oversold = true;
      }
    }
    if (realized !== 0) {
      rows.push({
        key,
        chainId,
        symbol,
        currentAmount: 0,
        currentValueUsd: 0,
        realizedPnlUsd: realized,
        costBasisUsd: null,
        unrealizedPnlUsd: null,
        complete: !oversold && !unknownUnit,
      });
    }
  }

  const realizedTotalUsd = rows.reduce((s, r) => s + r.realizedPnlUsd, 0);
  const unrealizedTotalUsd = rows.reduce((s, r) => s + (r.complete ? r.unrealizedPnlUsd ?? 0 : 0), 0);
  const hasPartial = rows.some((r) => !r.complete);

  rows.sort((a, b) => (b.currentValueUsd ?? 0) - (a.currentValueUsd ?? 0));
  return { rows, realizedTotalUsd, unrealizedTotalUsd, hasPartial };
}
