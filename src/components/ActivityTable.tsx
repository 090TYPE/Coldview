import { getChain } from '../config/chains';
import { toAmount } from '../data/types';
import { TokenIcon } from './TokenIcon';
import { buildTxKinds, activityLabel, type ActivityLabel } from '../data/activity';
import type { ActivityRow } from '../data/types';

const LABEL_STYLE: Record<ActivityLabel, string> = {
  swap: 'border-blue text-blue',
  receive: 'border-neon text-neon',
  send: 'border-danger text-danger',
  self: 'border-border text-muted',
};

const usd = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const when = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ActivityTable({ rows, owned }: { rows: ActivityRow[]; owned?: Set<string> }) {
  if (rows.length === 0) {
    return <div className="text-muted text-[12px] text-center py-10">No recent activity for these wallets.</div>;
  }
  const txKinds = buildTxKinds(rows);
  const ownedSet = owned ?? new Set<string>();
  return (
    <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-muted text-[10px] uppercase tracking-widest">
            <th className="text-left p-2.5 border-b border-border">When</th>
            <th className="text-left p-2.5 border-b border-border">Type</th>
            <th className="text-left p-2.5 border-b border-border">Flow</th>
            <th className="text-left p-2.5 border-b border-border">Asset</th>
            <th className="text-right p-2.5 border-b border-border">Amount</th>
            <th className="text-right p-2.5 border-b border-border">USD @ time</th>
            <th className="text-left p-2.5 border-b border-border">Chain</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.chainId}:${r.txHash}:${r.contract ?? 'native'}:${r.direction}`}>
              <td className="p-2.5 border-b border-row text-muted">{when(r.timestamp)}</td>
              <td className="p-2.5 border-b border-row">
                {(() => {
                  const label = activityLabel(r, txKinds, ownedSet);
                  return <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${LABEL_STYLE[label]}`}>{label}</span>;
                })()}
              </td>
              <td className={`p-2.5 border-b border-row ${r.direction === 'in' ? 'text-neon' : 'text-danger'}`}>
                {r.direction === 'in' ? '▼ in' : '▲ out'}
              </td>
              <td className="p-2.5 border-b border-row font-bold text-heading">
                <span className="flex items-center gap-2">
                  <TokenIcon iconUrl={r.iconUrl ?? null} symbol={r.symbol} size={16} />
                  {r.symbol}
                </span>
              </td>
              <td className="p-2.5 border-b border-row text-right">
                {toAmount(r.rawAmount, r.decimals).toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </td>
              <td className="p-2.5 border-b border-row text-right">{usd(r.usdAtTime)}</td>
              <td className="p-2.5 border-b border-row">
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted">{getChain(r.chainId).name}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
