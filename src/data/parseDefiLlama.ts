import { keyOf } from './types';
import type { TokenBalance, TokenKey, Price } from './types';

// Native coin -> CoinGecko id used by DefiLlama's `coingecko:` namespace.
const NATIVE_COINGECKO: Record<string, string> = {
  ETH: 'ethereum',
  POL: 'matic-network',
  SOL: 'solana',
  BTC: 'bitcoin',
  XDAI: 'xdai',
  CELO: 'celo',
};

export interface LlamaRequest {
  llamaKeys: string[];
  byLlamaKey: Record<string, TokenKey>;
}

export function defiLlamaKeys(balances: TokenBalance[]): LlamaRequest {
  const byLlamaKey: Record<string, TokenKey> = {};
  const set = new Set<string>();
  for (const b of balances) {
    const ourKey = keyOf(b.chainId, b.contract);
    let llamaKey: string;
    if (b.contract === null) {
      const cg = NATIVE_COINGECKO[b.symbol] ?? '';
      if (!cg) continue;
      llamaKey = `coingecko:${cg}`;
    } else if (b.chainId === 'solana') {
      // Solana mints are base58 and case-sensitive — do NOT lowercase.
      llamaKey = `solana:${b.contract}`;
    } else {
      llamaKey = `${b.chainId}:${b.contract.toLowerCase()}`;
    }
    set.add(llamaKey);
    byLlamaKey[llamaKey] = ourKey;
  }
  return { llamaKeys: [...set], byLlamaKey };
}

interface LlamaResponse {
  coins: Record<string, { price: number; symbol?: string; confidence?: number }>;
}

export function parseDefiLlamaPrices(
  raw: unknown,
  byLlamaKey: Record<string, TokenKey>,
): Record<TokenKey, Price> {
  const res = raw as LlamaResponse;
  const out: Record<TokenKey, Price> = {};
  if (!res?.coins) return out;
  for (const [llamaKey, data] of Object.entries(res.coins)) {
    const ourKey = byLlamaKey[llamaKey];
    if (!ourKey || typeof data.price !== 'number') continue;
    out[ourKey] = { usd: data.price, change24hPct: 0, symbol: data.symbol };
  }
  return out;
}
