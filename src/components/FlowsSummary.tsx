import { Panel, Label } from './primitives';
import type { FlowRow } from '../data/types';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  perToken: FlowRow[];
  totalInvested: number;
  totalCurrent: number;
  totalGain: number;
}

export function FlowsSummary({ perToken, totalInvested, totalCurrent, totalGain }: Props) {
  const up = totalGain >= 0;
  return (
    <Panel className="mb-3">
      <Label>Position flows</Label>
      <div className="flex gap-8 items-baseline mt-2 flex-wrap">
        <div>
          <div className="text-[10px] text-muted uppercase">Net invested</div>
          <div className="text-[22px] font-extrabold text-[#eafff6]">{usd(totalInvested)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">Current value</div>
          <div className="text-[22px] font-extrabold text-[#eafff6]">{usd(totalCurrent)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">Approx. gain</div>
          <div className={`text-[22px] font-extrabold ${up ? 'text-neon' : 'text-danger'}`}>
            {up ? '+' : '−'}{usd(Math.abs(totalGain))}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-[#3f5563] mt-2">
        Flow-based estimate (USD in − USD out at historical prices vs current value). Not tax cost-basis; excludes transfers between your own wallets.
      </div>
      {perToken.length > 0 && (
        <div className="mt-3 text-[12px]">
          {perToken.slice(0, 6).map((r) => (
            <div key={r.symbol} className="flex justify-between py-[3px] border-b border-[#0f171e] last:border-0">
              <span className="font-bold text-[#e6eef3]">{r.symbol}</span>
              <span className="text-muted">inv {usd(r.investedUsd)} · now {usd(r.currentUsd)} ·
                <span className={r.gainUsd >= 0 ? 'text-neon' : 'text-danger'}> {r.gainUsd >= 0 ? '+' : '−'}{usd(Math.abs(r.gainUsd))}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
