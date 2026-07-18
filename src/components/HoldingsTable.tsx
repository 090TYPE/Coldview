import { getChain } from '../config/chains';
import { TokenIcon } from './TokenIcon';
import type { Holding } from '../data/types';

const usd = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const pct = (n: number | null) => (n === null ? '' : `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}%`);

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-muted text-[10px] uppercase tracking-widest">
            <th className="text-left p-2.5 border-b border-border">Asset</th>
            <th className="text-left p-2.5 border-b border-border">Chain</th>
            <th className="text-right p-2.5 border-b border-border">Balance</th>
            <th className="text-right p-2.5 border-b border-border">Price</th>
            <th className="text-right p-2.5 border-b border-border">Value</th>
            <th className="text-right p-2.5 border-b border-border">24h</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.key}>
              <td className="p-2.5 border-b border-[#0f171e] font-bold text-[#e6eef3]">
                <div className="flex items-center gap-2">
                  <TokenIcon iconUrl={h.iconUrl} symbol={h.symbol} />
                  <span>{h.symbol}</span>
                </div>
              </td>
              <td className="p-2.5 border-b border-[#0f171e]">
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-[#8ba0ad]">
                  {getChain(h.chainId).name}
                </span>
              </td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{h.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{usd(h.priceUsd)}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{usd(h.valueUsd)}</td>
              <td className={`p-2.5 border-b border-[#0f171e] text-right ${h.change24hPct === null ? 'text-muted' : h.change24hPct >= 0 ? 'text-neon' : 'text-danger'}`}>
                {pct(h.change24hPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
