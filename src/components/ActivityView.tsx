import { useMemo } from 'react';
import { useActivity } from '../state/useActivity';
import { computeFlows } from '../data/activity';
import { ActivityTable } from './ActivityTable';
import { FlowsSummary } from './FlowsSummary';
import { LoadingSkeleton } from './primitives';
import type { ChainId, AllocationSlice } from '../data/types';
import type { Wallet } from '../data/walletStore';

interface Props {
  wallets: Wallet[];
  enabledChains: ChainId[];
  byToken: AllocationSlice[];
}

export function ActivityView({ wallets, enabledChains, byToken }: Props) {
  const { data, isLoading } = useActivity(wallets, enabledChains, true);

  const flows = useMemo(() => {
    const owned = new Set(wallets.map((w) => w.address.toLowerCase()));
    const currentBySymbol = new Map(byToken.map((s) => [s.label, s.valueUsd]));
    return computeFlows(data ?? [], owned, currentBySymbol);
  }, [data, wallets, byToken]);

  if (isLoading || !data) return <LoadingSkeleton />;

  return (
    <>
      <FlowsSummary
        perToken={flows.perToken}
        totalInvested={flows.totalInvested}
        totalCurrent={flows.totalCurrent}
        totalGain={flows.totalGain}
      />
      <ActivityTable rows={data} />
    </>
  );
}
