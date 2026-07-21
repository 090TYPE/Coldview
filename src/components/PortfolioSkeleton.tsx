import { Panel } from './primitives';

// A single shimmering placeholder bar.
function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

// Loading placeholder that mirrors the real portfolio layout (hero + allocation,
// then a holdings table) so the page appears to fill in rather than pop.
export function PortfolioSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading portfolio" aria-busy="true">
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3 mb-3">
        <Panel className="!p-4">
          <Bar className="h-2.5 w-24 mb-3" />
          <Bar className="h-8 w-48 mb-2" />
          <Bar className="h-2.5 w-32 mb-5" />
          <Bar className="h-28 w-full" />
        </Panel>
        <Panel className="!p-4">
          <Bar className="h-2.5 w-20 mb-4" />
          <div className="flex items-center gap-4">
            <div className="skeleton rounded-full h-28 w-28 shrink-0" />
            <div className="flex-1 space-y-2">
              <Bar className="h-2.5 w-full" />
              <Bar className="h-2.5 w-5/6" />
              <Bar className="h-2.5 w-4/6" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="bg-panel border border-border rounded-[10px] p-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-row last:border-b-0">
            <div className="skeleton rounded-full h-6 w-6 shrink-0" />
            <Bar className="h-3 w-24" />
            <span className="flex-1" />
            <Bar className="h-3 w-16" />
            <Bar className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
