import { useState } from 'react';
import { useAppStore } from '../state/store';
import { Panel } from './primitives';
import type { Holding } from '../data/types';

const usd = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 });

export function AlertsView({ holdings }: { holdings: Holding[] }) {
  const { alerts, addAlert, removeAlert, setAlertTriggered } = useAppStore();
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [target, setTarget] = useState('');

  const priceOf = (sym: string) => holdings.find((h) => h.symbol.toUpperCase() === sym.toUpperCase())?.priceUsd ?? null;
  const symbols = [...new Set(holdings.map((h) => h.symbol))].sort();
  const canNotify = typeof Notification !== 'undefined';

  const submit = async () => {
    const t = parseFloat(target);
    if (!symbol.trim() || !isFinite(t) || t <= 0) return;
    if (canNotify && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* denied */ }
    }
    addAlert(symbol, direction, t);
    setSymbol('');
    setTarget('');
  };

  return (
    <>
      <Panel>
        <div className="flex gap-2 items-end flex-wrap text-[12px]">
          <label className="flex flex-col gap-1">
            <span className="text-muted">Asset</span>
            <input list="alert-symbols" className="bg-panel border border-border rounded px-2 py-1 w-28 outline-none focus:border-neon" placeholder="ETH" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            <datalist id="alert-symbols">{symbols.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">When price is</span>
            <select className="bg-panel border border-border rounded px-2 py-1 text-text outline-none" value={direction} onChange={(e) => setDirection(e.target.value as 'above' | 'below')}>
              <option value="above">above</option>
              <option value="below">below</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Target USD</span>
            <input type="number" className="bg-panel border border-border rounded px-2 py-1 w-28 outline-none focus:border-neon" placeholder="3500" value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </label>
          <button onClick={submit} className="px-3 py-1.5 rounded-lg bg-neon/10 border border-neon text-neon">Add alert</button>
        </div>
        <div className="text-[11px] text-muted mt-2">
          Alerts fire as a browser notification while Coldview is open (no server, nothing leaves your device). If notifications are off, a 🔔 badge appears here instead.
        </div>
      </Panel>

      <div className="mt-3">
        {alerts.length === 0 ? (
          <div className="text-muted text-[12px] text-center py-8">No alerts yet. Add one above.</div>
        ) : (
          <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-muted text-[10px] uppercase tracking-widest">
                  <th className="text-left p-2.5 border-b border-border">Asset</th>
                  <th className="text-left p-2.5 border-b border-border">Condition</th>
                  <th className="text-right p-2.5 border-b border-border">Now</th>
                  <th className="text-left p-2.5 border-b border-border">Status</th>
                  <th className="p-2.5 border-b border-border" />
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td className="p-2.5 border-b border-row font-bold text-heading">{a.symbol}</td>
                    <td className="p-2.5 border-b border-row">{a.direction} {usd(a.target)}</td>
                    <td className="p-2.5 border-b border-row text-right">{usd(priceOf(a.symbol))}</td>
                    <td className="p-2.5 border-b border-row">
                      {a.triggered ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-neon text-neon">🔔 triggered</span>
                          <button className="text-blue hover:underline text-[11px]" onClick={() => setAlertTriggered(a.id, false)}>re-arm</button>
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted">armed</span>
                      )}
                    </td>
                    <td className="p-2.5 border-b border-row text-right">
                      <button aria-label={`remove ${a.symbol} alert`} className="text-muted hover:text-danger" onClick={() => removeAlert(a.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
