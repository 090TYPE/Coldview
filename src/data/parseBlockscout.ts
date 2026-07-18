import type { ChainId, TokenBalance } from './types';

interface BlockscoutTokenBalance {
  token: {
    address?: string;
    address_hash?: string;
    symbol: string | null;
    decimals: string | null;
    type: string;
    exchange_rate?: string | null;
    icon_url?: string | null;
  };
  value: string;
}

export function parseBlockscoutBalances(raw: unknown, chainId: ChainId): TokenBalance[] {
  if (!Array.isArray(raw)) return [];
  const out: TokenBalance[] = [];
  for (const item of raw as BlockscoutTokenBalance[]) {
    if (!item?.token || item.value === '0' || item.value == null) continue;
    if (item.token.type && !item.token.type.startsWith('ERC-20')) continue;
    // Blockscout returns thousands of tokens for active wallets, most of them spam.
    // Keep only those it prices (a positive market exchange_rate) — this drops spam
    // and bounds the downstream price lookups.
    const rate = Number(item.token.exchange_rate);
    if (!Number.isFinite(rate) || rate <= 0) continue;
    // The v2 API returns the contract as `address_hash`; older shapes use `address`.
    const address = item.token.address_hash ?? item.token.address;
    if (!address) continue;
    const decimals = Number(item.token.decimals ?? '18');
    if (!Number.isFinite(decimals)) continue;
    out.push({
      chainId,
      contract: address.toLowerCase(),
      symbol: item.token.symbol ?? '???',
      decimals,
      rawBalance: item.value,
      iconUrl: item.token.icon_url ?? null,
    });
  }
  return out;
}

export function nativeBalance(value: string, chainId: ChainId, symbol: string): TokenBalance {
  return { chainId, contract: null, symbol, decimals: 18, rawBalance: value };
}
