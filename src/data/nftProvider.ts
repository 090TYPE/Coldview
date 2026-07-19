import { getChain } from '../config/chains';
import { parseNftItems } from './parseNft';
import type { ChainId, Nft } from './types';

// EVM NFTs (ERC-721 + ERC-1155) for one address on one chain, via Blockscout.
export async function fetchNfts(address: string, chainId: ChainId): Promise<Nft[]> {
  const base = getChain(chainId).blockscoutBaseUrl;
  if (!base) return [];
  const res = await fetch(`${base}/api/v2/addresses/${address}/nft?type=ERC-721,ERC-1155`);
  if (!res.ok) return [];
  return parseNftItems(await res.json(), chainId);
}
