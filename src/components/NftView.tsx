import { useNfts } from '../state/useNfts';
import { NftGallery } from './NftGallery';
import { LoadingSkeleton } from './primitives';
import type { ChainId } from '../data/types';
import type { Wallet } from '../data/walletStore';

interface Props {
  wallets: Wallet[];
  enabledChains: ChainId[];
}

export function NftView({ wallets, enabledChains }: Props) {
  const { data, isLoading } = useNfts(wallets, enabledChains, true);
  if (isLoading || !data) return <LoadingSkeleton />;
  return <NftGallery nfts={data} />;
}
