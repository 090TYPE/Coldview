import { useMemo } from 'react';
import { useActivity } from '../state/useActivity';
import { computeRecentFlows } from '../data/activity';
import { ActivityTable } from './ActivityTable';
import { FlowsSummary } from './FlowsSummary';
import { LoadingSkeleton } from './primitives';
import type { ChainId } from '../data/types';
import type { Wallet } from '../data/walletStore';

interface Props {
  wallets: Wallet[];
  enabledChains: ChainId[];
}

export function ActivityView({ wallets, enabledChains }: Props) {
  const { data, isLoading } = useActivity(wallets, enabledChains, true);

  const flows = useMemo(() => {
    const owned = new Set(wallets.map((w) => w.address.toLowerCase()));
    return computeRecentFlows(data ?? [], owned);
  }, [data, wallets]);

  if (isLoading || !data) return <LoadingSkeleton />;

  return (
    <>
      <FlowsSummary
        perToken={flows.perToken}
        totalIn={flows.totalIn}
        totalOut={flows.totalOut}
        totalNet={flows.totalNet}
      />
      <ActivityTable rows={data} />
    </>
  );
}
