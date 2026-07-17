import type { ChainId, ChainInfo } from '../data/types';

export const CHAINS: ChainInfo[] = [
  { id: 'ethereum', name: 'Ethereum', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://eth.blockscout.com', color: '#3aa0ff' },
  { id: 'arbitrum', name: 'Arbitrum', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://arbitrum.blockscout.com', color: '#22e6a4' },
  { id: 'base', name: 'Base', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://base.blockscout.com', color: '#5eead4' },
  { id: 'polygon', name: 'Polygon', nativeSymbol: 'POL', blockscoutBaseUrl: 'https://polygon.blockscout.com', color: '#8a5cff' },
  { id: 'optimism', name: 'Optimism', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://optimism.blockscout.com', color: '#ffb020' },
];

export function getChain(id: ChainId): ChainInfo {
  const c = CHAINS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chain: ${id}`);
  return c;
}
