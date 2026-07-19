import type { Family } from './family';

export type ChainId =
  | 'ethereum' | 'arbitrum' | 'base' | 'polygon' | 'optimism'
  | 'solana' | 'bitcoin';

export interface ChainInfo {
  id: ChainId;
  name: string;
  nativeSymbol: string;
  family: Family;
  color: string;
  blockscoutBaseUrl?: string; // EVM only
  rpcUrl?: string;            // Solana only
  esploraBaseUrl?: string;    // Bitcoin only
}

export interface TokenBalance {
  chainId: ChainId;
  contract: string | null; // null = native coin
  symbol: string;
  decimals: number;
  rawBalance: string; // integer string
  iconUrl?: string | null;
}

export type TokenKey = string; // `${chainId}:${contract-lowercased | 'native'}`

export interface Price {
  usd: number;
  change24hPct: number;
  symbol?: string;
}

export interface Holding {
  key: TokenKey;
  chainId: ChainId;
  symbol: string;
  amount: number;
  priceUsd: number | null;
  valueUsd: number | null;
  change24hPct: number | null;
  iconUrl: string | null;
}

export interface AllocationSlice {
  label: string;
  valueUsd: number;
  pct: number;
  iconUrl?: string | null;
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
  const neg = rawBalance.startsWith('-');
  const digits = (neg ? rawBalance.slice(1) : rawBalance).replace(/^0+(?=\d)/, '');
  const padded = digits.padStart(decimals + 1, '0');
  const cut = padded.length - decimals;
  const intPart = padded.slice(0, cut);
  const fracPart = decimals > 0 ? padded.slice(cut) : '';
  const value = Number(fracPart ? `${intPart}.${fracPart}` : intPart);
  return neg ? -value : value;
}

export interface Transfer {
  chainId: ChainId;
  txHash: string;
  timestamp: number; // unix seconds
  direction: 'in' | 'out';
  symbol: string;
  contract: string | null;
  decimals: number;
  rawAmount: string;
  counterparty: string; // lowercased other-party address
  iconUrl?: string | null; // token logo when known (EVM token transfers)
}

export interface ActivityRow extends Transfer {
  usdAtTime: number | null;
}

export interface FlowRow {
  symbol: string;
  inUsd: number;
  outUsd: number;
  netUsd: number;
}
