import { getChain } from '../config/chains';
import { TokenIcon } from './TokenIcon';
import { Sparkline } from './Sparkline';
import { useMoney } from '../state/useMoney';
import type { Holding, TokenKey } from '../data/types';

const pct = (n: number | null) => (n === null ? '' : `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}%`);

interface TableProps {
  holdings: Holding[];
  sparklines?: Record<TokenKey, number[]>;
  onHide?: (key: TokenKey) => void;   // renders a per-row hide/unhide action
  hiddenMode?: boolean;               // true when listing already-hidden tokens (show ↺ restore)
  onSelect?: (h: Holding) => void;    // clicking a token opens its detail view
}

export function HoldingsTable({ holdings, sparklines, onHide, hiddenMode, onSelect }: TableProps) {
  const money = useMoney();
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
            <th className="text-right p-2.5 border-b border-border">7d</th>
            <th className="text-right p-2.5 border-b border-border">24h</th>
            {onHide && <th className="p-2.5 border-b border-border" />}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.key}>
              <td className="p-2.5 border-b border-[#0f171e] font-bold text-[#e6eef3]">
                {onSelect ? (
                  <button className="flex items-center gap-2 hover:text-neon" onClick={() => onSelect(h)} title={`${h.symbol} details`}>
                    <TokenIcon iconUrl={h.iconUrl} symbol={h.symbol} />
                    <span>{h.symbol}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <TokenIcon iconUrl={h.iconUrl} symbol={h.symbol} />
                    <span>{h.symbol}</span>
                  </div>
                )}
              </td>
              <td className="p-2.5 border-b border-[#0f171e]">
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-[#8ba0ad]">
                  {getChain(h.chainId).name}
                </span>
              </td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{h.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{money(h.priceUsd)}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{money(h.valueUsd)}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">
                <span className="inline-flex justify-end w-full"><Sparkline data={sparklines?.[h.key]} /></span>
              </td>
              <td className={`p-2.5 border-b border-[#0f171e] text-right ${h.change24hPct === null ? 'text-muted' : h.change24hPct >= 0 ? 'text-neon' : 'text-danger'}`}>
                {pct(h.change24hPct)}
              </td>
              {onHide && (
                <td className="p-2.5 border-b border-[#0f171e] text-right">
                  <button
                    aria-label={`${hiddenMode ? 'unhide' : 'hide'} ${h.symbol}`}
                    title={hiddenMode ? 'Show again' : 'Hide (spam / unwanted)'}
                    className="text-muted hover:text-neon"
                    onClick={() => onHide(h.key)}
                  >
                    {hiddenMode ? '↺' : '×'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
