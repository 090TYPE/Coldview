import { useMemo, useState } from 'react';
import { HoldingsTable } from './HoldingsTable';
import { holdingsToCsv } from '../data/holdingsCsv';
import type { Holding } from '../data/types';

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

export function HoldingsPanel({ holdings }: { holdings: Holding[] }) {
  const [hideDust, setHideDust] = useState(false);
  const [sort, setSort] = useState<Sort>('value');

  const rows = useMemo(() => {
    let r = hideDust ? holdings.filter((h) => (h.valueUsd ?? 0) >= 1) : holdings;
    r = [...r].sort((a, b) =>
      sort === 'name' ? a.symbol.localeCompare(b.symbol) : (b.valueUsd ?? 0) - (a.valueUsd ?? 0),
    );
    return r;
  }, [holdings, hideDust, sort]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap text-[12px]">
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
        <span className="flex-1" />
        <button
          className="border border-border rounded-full px-3 py-1 text-blue hover:border-blue"
          onClick={() => download('coldview-holdings.csv', holdingsToCsv(rows))}
        >
          Export CSV
        </button>
      </div>
      <HoldingsTable holdings={rows} />
    </div>
  );
}
