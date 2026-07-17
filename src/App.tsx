import { useEffect, useState } from 'react';
import { useAppStore } from './state/store';
import { usePortfolio } from './state/usePortfolio';
import { getSnapshots, type SnapshotPoint } from './data/snapshot';
import { TopBar } from './components/TopBar';
import { ChainFilter } from './components/ChainFilter';
import { HeroPanel } from './components/HeroPanel';
import { AllocationPanel } from './components/AllocationPanel';
import { HoldingsTable } from './components/HoldingsTable';
import { EmptyState } from './components/EmptyState';
import { ErrorBanner } from './components/ErrorBanner';
import { LoadingSkeleton, PrivacyNote } from './components/primitives';

export default function App() {
  const { wallets, enabledChains, period, byokKey, addWallet, removeWallet, toggleChain, setPeriod, setApiKey } = useAppStore();
  const { data, isLoading, isError } = usePortfolio(wallets, enabledChains);
  const [series, setSeries] = useState<SnapshotPoint[]>([]);

  useEffect(() => {
    getSnapshots().then(setSeries);
  }, [data?.totalValueUsd]);

  if (wallets.length === 0) {
    return <div className="p-4 max-w-6xl mx-auto"><EmptyState onAdd={(a) => addWallet(a, 'Main')} /></div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <TopBar wallets={wallets} onAdd={addWallet} onRemove={removeWallet} apiKey={byokKey} onApiKey={setApiKey} />
      <ChainFilter enabled={enabledChains} onToggle={toggleChain} />

      {isError && <ErrorBanner message="Couldn't load some data. It'll retry automatically." />}

      {isLoading || !data ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3 mb-3">
            <HeroPanel
              total={data.totalValueUsd}
              change24h={data.change24hPct}
              walletCount={wallets.length}
              period={period}
              onPeriod={setPeriod}
              series={series}
            />
            <AllocationPanel byToken={data.byToken} byChain={data.byChain} />
          </div>
          <HoldingsTable holdings={data.holdings} />
        </>
      )}
      <PrivacyNote />
    </div>
  );
}
