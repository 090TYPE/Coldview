import { useMemo, useState } from 'react';
import { HoldingsTable } from './HoldingsTable';
import { holdingsToCsv } from '../data/holdingsCsv';
import { useAppStore } from '../state/store';
import { getChain } from '../config/chains';
import type { Holding, TokenKey } from '../data/types';

type Sort = 'value' | 'name';

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function HoldingsPanel({ holdings, sparklines }: { holdings: Holding[]; sparklines?: Record<TokenKey, number[]> }) {
  const [hideDust, setHideDust] = useState(false);
  const [sort, setSort] = useState<Sort>('value');
  const [showHidden, setShowHidden] = useState(false);
  const [query, setQuery] = useState('');
  const { hiddenKeys, hideToken, unhideToken } = useAppStore();

  const hidden = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);

  const rows = useMemo(() => {
    let r = holdings.filter((h) => !hidden.has(h.key));
    if (hideDust) r = r.filter((h) => (h.valueUsd ?? 0) >= 1);
    const q = query.trim().toLowerCase();
    if (q) r = r.filter((h) => h.symbol.toLowerCase().includes(q) || getChain(h.chainId).name.toLowerCase().includes(q));
    r = [...r].sort((a, b) =>
      sort === 'name' ? a.symbol.localeCompare(b.symbol) : (b.valueUsd ?? 0) - (a.valueUsd ?? 0),
    );
    return r;
  }, [holdings, hidden, hideDust, sort, query]);

  const hiddenRows = useMemo(() => holdings.filter((h) => hidden.has(h.key)), [holdings, hidden]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap text-[12px]">
        <input
          type="search"
          aria-label="Search holdings"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-panel border border-border rounded px-2 py-0.5 text-text outline-none focus:border-neon w-32"
        />
        <label className="flex items-center gap-1.5 text-muted cursor-pointer">
          <input type="checkbox" aria-label="Hide dust" checked={hideDust} onChange={(e) => setHideDust(e.target.checked)} />
          Hide dust (&lt; $1)
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          Sort
          <select className="bg-panel border border-border rounded px-1.5 py-0.5 text-text outline-none" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="value">Value</option>
            <option value="name">Name</option>
          </select>
        </label>
        {hiddenRows.length > 0 && (
          <button className="text-muted hover:text-neon" onClick={() => setShowHidden((v) => !v)}>
            {showHidden ? 'Hide list' : `Hidden (${hiddenRows.length})`}
          </button>
        )}
        <span className="flex-1" />
        <button
          className="border border-border rounded-full px-3 py-1 text-blue hover:border-blue"
          onClick={() => download('coldview-holdings.csv', holdingsToCsv(rows))}
        >
          Export CSV
        </button>
      </div>
      <HoldingsTable holdings={rows} sparklines={sparklines} onHide={hideToken} />
      {showHidden && hiddenRows.length > 0 && (
        <div className="mt-3">
          <div className="text-muted text-[10px] uppercase tracking-widest mb-1.5">Hidden tokens</div>
          <HoldingsTable holdings={hiddenRows} sparklines={sparklines} onHide={unhideToken} hiddenMode />
        </div>
      )}
    </div>
  );
}
