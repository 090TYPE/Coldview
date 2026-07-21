import { useEffect, useState } from 'react';
import { relativeTime } from '../data/relativeTime';

interface Props {
  updatedAt: number;      // ms epoch of the last successful fetch (0 = never)
  isFetching: boolean;
  onRefresh: () => void;
}

// Shows how fresh the portfolio data is and lets the user force a refetch.
export function RefreshControl({ updatedAt, isFetching, onRefresh }: Props) {
  // Re-render every 30s so the "N ago" label stays current without a fetch.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const label = isFetching ? 'Updating…' : updatedAt ? `Updated ${relativeTime(updatedAt)}` : '';

  return (
    <div className="flex items-center gap-2 text-[11px] text-muted">
      {label && <span>{label}</span>}
      <button
        type="button"
        aria-label="Refresh data"
        title="Refresh now"
        disabled={isFetching}
        onClick={onRefresh}
        className="border border-border rounded-full w-6 h-6 flex items-center justify-center hover:border-neon hover:text-neon disabled:opacity-50"
      >
        <span className={isFetching ? 'inline-block animate-spin' : ''}>⟳</span>
      </button>
    </div>
  );
}
