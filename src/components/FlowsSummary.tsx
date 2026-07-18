import { Panel, Label } from './primitives';
import type { FlowRow } from '../data/types';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  perToken: FlowRow[];
  totalIn: number;
  totalOut: number;
  totalNet: number;
}

export function FlowsSummary({ perToken, totalIn, totalOut, totalNet }: Props) {
  const up = totalNet >= 0;
  return (
    <Panel className="mb-3">
      <Label>Recent flows</Label>
      <div className="flex gap-8 items-baseline mt-2 flex-wrap">
        <div>
          <div className="text-[10px] text-muted uppercase">Received</div>
          <div className="text-[22px] font-extrabold text-neon">{usd(totalIn)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">Sent</div>
          <div className="text-[22px] font-extrabold text-danger">{usd(totalOut)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">Net</div>
          <div className={`text-[22px] font-extrabold ${up ? 'text-neon' : 'text-danger'}`}>
            {up ? '+' : '−'}{usd(Math.abs(totalNet))}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-[#3f5563] mt-2">
        Totals for the recent transfers shown below (USD at the time of each), excluding transfers between your own wallets. This is a recent-flow view, not a full portfolio P&amp;L — older history beyond the recent window is not included.
      </div>
      {perToken.length > 0 && (
        <div className="mt-3 text-[12px]">
          {perToken.slice(0, 6).map((r) => (
            <div key={r.symbol} className="flex justify-between py-[3px] border-b border-[#0f171e] last:border-0">
              <span className="font-bold text-[#e6eef3]">{r.symbol}</span>
              <span className="text-muted">in {usd(r.inUsd)} · out {usd(r.outUsd)} ·
                <span className={r.netUsd >= 0 ? 'text-neon' : 'text-danger'}> {r.netUsd >= 0 ? '+' : '−'}{usd(Math.abs(r.netUsd))}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
