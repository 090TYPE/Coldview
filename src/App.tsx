import { useEffect, useState } from 'react';
import { useAppStore } from './state/store';
import { usePortfolio } from './state/usePortfolio';
import { getSnapshots, type SnapshotPoint } from './data/snapshot';
import { filterSeriesByPeriod } from './data/period';
import { TopBar } from './components/TopBar';
import { ChainFilter } from './components/ChainFilter';
import { HeroPanel } from './components/HeroPanel';
import { AllocationPanel } from './components/AllocationPanel';
import { HoldingsPanel } from './components/HoldingsPanel';
import { EmptyState } from './components/EmptyState';
import { ErrorBanner } from './components/ErrorBanner';
import { ActivityView } from './components/ActivityView';
import { LoadingSkeleton, PrivacyNote } from './components/primitives';

export default function App() {
  const { wallets, enabledChains, period, byokKey, view, addWallet, removeWallet, toggleChain, setPeriod, setApiKey, setView } = useAppStore();
  const { data, isLoading, isError } = usePortfolio(wallets, enabledChains);
  const [series, setSeries] = useState<SnapshotPoint[]>([]);

  useEffect(() => {
    getSnapshots().then(setSeries);
  }, [data?.totalValueUsd]);

  if (wallets.length === 0) {
    return <div className="p-4 max-w-6xl mx-auto"><EmptyState onAdd={(a) => addWallet(a, 'Main')} /></div>;
  }

  const chartSeries = filterSeriesByPeriod(series, period);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <TopBar wallets={wallets} onAdd={addWallet} onRemove={removeWallet} apiKey={byokKey} onApiKey={setApiKey} view={view} onView={setView} />
      <ChainFilter enabled={enabledChains} onToggle={toggleChain} />

      {view === 'activity' ? (
        <ActivityView wallets={wallets} enabledChains={enabledChains} />
      ) : (
        <>
          {isLoading && <LoadingSkeleton />}
          {isError && !isLoading && (
            <ErrorBanner message="Couldn't load your portfolio right now — it'll retry automatically." />
          )}
          {data && !isLoading && !isError && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3 mb-3">
                <HeroPanel
                  total={data.totalValueUsd}
                  change24h={data.change24hPct}
                  walletCount={wallets.length}
                  period={period}
                  onPeriod={setPeriod}
                  series={chartSeries}
                />
                <AllocationPanel byToken={data.byToken} byChain={data.byChain} />
              </div>
              <HoldingsPanel holdings={data.holdings} />
            </>
          )}
        </>
      )}
      <PrivacyNote />
    </div>
  );
}
