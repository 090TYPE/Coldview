import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from './state/store';
import { usePortfolio } from './state/usePortfolio';
import { useEnsNames } from './state/useEnsNames';
import { useSparklines } from './state/useSparklines';
import { getSnapshots, type SnapshotPoint } from './data/snapshot';
import { filterSeriesByPeriod } from './data/period';
import { readSharedView } from './data/share';
import { TopBar } from './components/TopBar';
import { ChainFilter } from './components/ChainFilter';
import { HeroPanel } from './components/HeroPanel';
import { AllocationPanel } from './components/AllocationPanel';
import { HoldingsPanel } from './components/HoldingsPanel';
import { EmptyState } from './components/EmptyState';
import { ErrorBanner } from './components/ErrorBanner';
import { ActivityView } from './components/ActivityView';
import { NftView } from './components/NftView';
import { LoadingSkeleton, PrivacyNote } from './components/primitives';

export default function App() {
  const store = useAppStore();
  const shared = useMemo(() => readSharedView(), []);
  const readOnly = shared !== null;

  // In shared mode the portfolio comes from the URL, not the viewer's store,
  // and nothing is persisted to the viewer's device.
  const wallets = shared ? shared.wallets : store.wallets;
  const enabledChains = shared ? shared.chains : store.enabledChains;
  const { period, byokKey, view } = store;

  const { data, isLoading, isError } = usePortfolio(wallets, enabledChains, !readOnly);
  const ensByAddress = useEnsNames(wallets.map((w) => w.address));
  const sparklines = useSparklines(data?.holdings ?? []);
  const [series, setSeries] = useState<SnapshotPoint[]>([]);

  useEffect(() => {
    if (!readOnly) getSnapshots().then(setSeries);
  }, [data?.totalValueUsd, readOnly]);

  const exitShared = () => {
    window.location.href = window.location.pathname;
  };

  if (wallets.length === 0) {
    return <div className="p-4 max-w-6xl mx-auto"><EmptyState onAdd={(a) => store.addWallet(a, 'Main')} /></div>;
  }

  const chartSeries = filterSeriesByPeriod(series, period);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <TopBar
        wallets={wallets}
        onAdd={store.addWallet}
        onRemove={store.removeWallet}
        apiKey={byokKey}
        onApiKey={store.setApiKey}
        view={view}
        onView={store.setView}
        ensByAddress={ensByAddress}
        chains={enabledChains}
        readOnly={readOnly}
        onExitShared={exitShared}
      />
      {readOnly && (
        <div className="mb-3 text-[12px] px-3 py-2 rounded-lg border border-blue/40 bg-blue/5 text-[#9fb0bd]">
          You're viewing a <span className="text-blue">shared, read-only</span> portfolio. Data is fetched live on your device; nothing is saved.
        </div>
      )}
      {!readOnly && <ChainFilter enabled={enabledChains} onToggle={store.toggleChain} />}

      {view === 'activity' ? (
        <ActivityView wallets={wallets} enabledChains={enabledChains} />
      ) : view === 'nfts' ? (
        <NftView wallets={wallets} enabledChains={enabledChains} />
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
                  onPeriod={store.setPeriod}
                  series={chartSeries}
                />
                <AllocationPanel byToken={data.byToken} byChain={data.byChain} />
              </div>
              <HoldingsPanel holdings={data.holdings} sparklines={sparklines} />
            </>
          )}
        </>
      )}
      <PrivacyNote />
    </div>
  );
}
