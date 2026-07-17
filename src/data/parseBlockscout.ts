import type { ChainId, TokenBalance } from './types';

interface BlockscoutTokenBalance {
  token: { address: string; symbol: string | null; decimals: string | null; type: string };
  value: string;
}

export function parseBlockscoutBalances(raw: unknown, chainId: ChainId): TokenBalance[] {
  if (!Array.isArray(raw)) return [];
  const out: TokenBalance[] = [];
  for (const item of raw as BlockscoutTokenBalance[]) {
    if (!item?.token || item.value === '0' || item.value == null) continue;
    if (item.token.type && !item.token.type.startsWith('ERC-20')) continue;
    const decimals = Number(item.token.decimals ?? '18');
    if (!Number.isFinite(decimals)) continue;
    out.push({
      chainId,
      contract: item.token.address.toLowerCase(),
      symbol: item.token.symbol ?? '???',
      decimals,
      rawBalance: item.value,
    });
  }
  return out;
}

export function nativeBalance(value: string, chainId: ChainId, symbol: string): TokenBalance {
  return { chainId, contract: null, symbol, decimals: 18, rawBalance: value };
}
