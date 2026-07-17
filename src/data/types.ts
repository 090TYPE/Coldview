export type ChainId = 'ethereum' | 'arbitrum' | 'base' | 'polygon' | 'optimism';

export interface ChainInfo {
  id: ChainId;
  name: string;
  nativeSymbol: string;
  blockscoutBaseUrl: string;
  color: string;
}

export interface TokenBalance {
  chainId: ChainId;
  contract: string | null; // null = native coin
  symbol: string;
  decimals: number;
  rawBalance: string; // integer string
}

export type TokenKey = string; // `${chainId}:${contract-lowercased | 'native'}`

export interface Price {
  usd: number;
  change24hPct: number;
}

export interface Holding {
  key: TokenKey;
  chainId: ChainId;
  symbol: string;
  amount: number;
  priceUsd: number | null;
  valueUsd: number | null;
  change24hPct: number | null;
}

export interface AllocationSlice {
  label: string;
  valueUsd: number;
  pct: number;
}

export interface PortfolioSnapshot {
  holdings: Holding[];
  totalValueUsd: number;
  change24hPct: number;
  byToken: AllocationSlice[];
  byChain: AllocationSlice[];
}

export function keyOf(chainId: ChainId, contract: string | null): TokenKey {
  return `${chainId}:${contract ? contract.toLowerCase() : 'native'}`;
}

export function toAmount(rawBalance: string, decimals: number): number {
  return Number(rawBalance) / 10 ** decimals;
}
