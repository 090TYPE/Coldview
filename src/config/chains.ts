import type { ChainId, ChainInfo } from '../data/types';

export const CHAINS: ChainInfo[] = [
  { id: 'ethereum', name: 'Ethereum', nativeSymbol: 'ETH', family: 'evm', color: '#3aa0ff', blockscoutBaseUrl: 'https://eth.blockscout.com' },
  { id: 'arbitrum', name: 'Arbitrum', nativeSymbol: 'ETH', family: 'evm', color: '#22e6a4', blockscoutBaseUrl: 'https://arbitrum.blockscout.com' },
  { id: 'base', name: 'Base', nativeSymbol: 'ETH', family: 'evm', color: '#5eead4', blockscoutBaseUrl: 'https://base.blockscout.com' },
  { id: 'polygon', name: 'Polygon', nativeSymbol: 'POL', family: 'evm', color: '#8a5cff', blockscoutBaseUrl: 'https://polygon.blockscout.com' },
  { id: 'optimism', name: 'Optimism', nativeSymbol: 'ETH', family: 'evm', color: '#ffb020', blockscoutBaseUrl: 'https://optimism.blockscout.com' },
  { id: 'zksync', name: 'zkSync Era', nativeSymbol: 'ETH', family: 'evm', color: '#8c8dfc', blockscoutBaseUrl: 'https://zksync.blockscout.com' },
  { id: 'scroll', name: 'Scroll', nativeSymbol: 'ETH', family: 'evm', color: '#f5b895', blockscoutBaseUrl: 'https://scroll.blockscout.com' },
  { id: 'gnosis', name: 'Gnosis', nativeSymbol: 'XDAI', family: 'evm', color: '#48a9a6', blockscoutBaseUrl: 'https://gnosis.blockscout.com' },
  { id: 'celo', name: 'Celo', nativeSymbol: 'CELO', family: 'evm', color: '#d7e04a', blockscoutBaseUrl: 'https://celo.blockscout.com' },
  { id: 'solana', name: 'Solana', nativeSymbol: 'SOL', family: 'solana', color: '#14f195', rpcUrl: 'https://solana-rpc.publicnode.com' },
  { id: 'bitcoin', name: 'Bitcoin', nativeSymbol: 'BTC', family: 'bitcoin', color: '#f7931a', esploraBaseUrl: 'https://blockstream.info' },
];

export function getChain(id: ChainId): ChainInfo {
  const c = CHAINS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chain: ${id}`);
  return c;
}
