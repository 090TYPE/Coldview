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

  const owned = useMemo(() => new Set(wallets.map((w) => w.address.toLowerCase())), [wallets]);
  const flows = useMemo(() => computeRecentFlows(data ?? [], owned), [data, owned]);

  if (isLoading || !data) return <LoadingSkeleton />;

  return (
    <>
      <FlowsSummary
        perToken={flows.perToken}
        totalIn={flows.totalIn}
        totalOut={flows.totalOut}
        totalNet={flows.totalNet}
      />
      <ActivityTable rows={data} owned={owned} />
    </>
  );
}
