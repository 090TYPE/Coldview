import { usePnl } from '../state/usePnl';
import { useGas } from '../state/useGas';
import { getChain } from '../config/chains';
import { realizedEventsToCsv } from '../data/taxCsv';
import { useMoney } from '../state/useMoney';
import type { ChainId as ChainIdT } from '../data/types';
import { Panel, Label, LoadingSkeleton } from './primitives';
import type { ChainId, Holding } from '../data/types';
import type { PnlRow } from '../data/costBasis';
import type { Wallet } from '../data/walletStore';

function downloadCsv(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Signed({ n }: { n: number | null }) {
  const money = useMoney();
  if (n === null) return <span className="text-muted">—</span>;
  const cls = n > 0 ? 'text-neon' : n < 0 ? 'text-danger' : 'text-muted';
  const sign = n > 0 ? '+' : '';
  return <span className={cls}>{sign}{money(n)}</span>;
}

interface Props {
  wallets: Wallet[];
  enabledChains: ChainId[];
  holdings: Holding[];
}

export function PnlView({ wallets, enabledChains, holdings }: Props) {
  const money = useMoney();
  const { data, isLoading } = usePnl(wallets, enabledChains, holdings, true);
  const { data: gasByChain } = useGas(wallets, enabledChains, true);
  if (isLoading || !data) return <LoadingSkeleton />;

  const { rows, realizedTotalUsd, unrealizedTotalUsd, hasPartial, realizedEvents } = data;

  // Value gas in USD using the native-coin price from current holdings (all EVM
  // natives are 18 decimals). Chains without a priced native holding are skipped.
  const nativePrice: Record<string, number> = {};
  for (const h of holdings) {
    if (h.priceUsd != null && nativePrice[h.symbol.toUpperCase()] === undefined) {
      nativePrice[h.symbol.toUpperCase()] = h.priceUsd;
    }
  }
  let gasUsd: number | null = null;
  if (gasByChain) {
    for (const [chainId, wei] of Object.entries(gasByChain)) {
      const p = nativePrice[getChain(chainId as ChainIdT).nativeSymbol.toUpperCase()];
      if (p !== undefined) gasUsd = (gasUsd ?? 0) + (Number(BigInt(wei)) / 1e18) * p;
    }
  }

  if (rows.length === 0) {
    return <div className="text-muted text-[12px] text-center py-10">No cost-basis history found for these wallets.</div>;
  }

  return (
    <>
      {realizedEvents.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            className="border border-border rounded-full px-3 py-1 text-[12px] text-blue hover:border-blue"
            onClick={() => downloadCsv('coldview-tax-report.csv', realizedEventsToCsv(realizedEvents))}
            title="Capital-gains report (FIFO, Form 8949 style) — one row per matched sale"
          >
            ⬇ Export tax report (CSV)
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Panel>
          <Label>Unrealized P&L</Label>
          <div className="text-xl font-bold mt-1"><Signed n={unrealizedTotalUsd} /></div>
        </Panel>
        <Panel>
          <Label>Realized P&L</Label>
          <div className="text-xl font-bold mt-1"><Signed n={realizedTotalUsd} /></div>
        </Panel>
        <Panel>
          <Label>Gas paid</Label>
          <div className="text-xl font-bold mt-1 text-danger" title="Fees you paid across tracked history">{money(gasUsd)}</div>
        </Panel>
        <Panel>
          <Label>Method</Label>
          <div className="text-[12px] text-muted mt-1">FIFO cost basis, priced at transfer time. Gas summed from sent txs.</div>
        </Panel>
      </div>

      {hasPartial && (
        <div className="mb-3 text-[12px] px-3 py-2 rounded-lg border border-[#ffb020]/40 bg-[#ffb020]/5 text-[#c9b78a]">
          Some tokens have only partial history available — their cost basis and unrealized P&L are omitted (shown as “—”) rather than estimated. Realized P&L from matched sells is still included.
        </div>
      )}

      <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-muted text-[10px] uppercase tracking-widest">
              <th className="text-left p-2.5 border-b border-border">Asset</th>
              <th className="text-right p-2.5 border-b border-border">Amount</th>
              <th className="text-right p-2.5 border-b border-border">Value</th>
              <th className="text-right p-2.5 border-b border-border">Cost basis</th>
              <th className="text-right p-2.5 border-b border-border">Unrealized</th>
              <th className="text-right p-2.5 border-b border-border">Realized</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: PnlRow) => (
              <tr key={r.key}>
                <td className="p-2.5 border-b border-[#0f171e] font-bold text-[#e6eef3]">
                  <span className="flex items-center gap-2">
                    {r.symbol}
                    {!r.complete && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#ffb020]/40 text-[#c9b78a]">partial</span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-[#8ba0ad]">{getChain(r.chainId).name}</span>
                  </span>
                </td>
                <td className="p-2.5 border-b border-[#0f171e] text-right">{r.currentAmount.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
                <td className="p-2.5 border-b border-[#0f171e] text-right">{money(r.currentValueUsd)}</td>
                <td className="p-2.5 border-b border-[#0f171e] text-right text-muted">{money(r.costBasisUsd)}</td>
                <td className="p-2.5 border-b border-[#0f171e] text-right"><Signed n={r.unrealizedPnlUsd} /></td>
                <td className="p-2.5 border-b border-[#0f171e] text-right"><Signed n={r.realizedPnlUsd || null} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
