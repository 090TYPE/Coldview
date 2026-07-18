import type { TokenBalance } from './types';

interface EsploraStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
}
interface EsploraAddress {
  chain_stats?: EsploraStats;
  mempool_stats?: EsploraStats;
}

export function parseEsploraBalance(raw: unknown): TokenBalance | null {
  const info = raw as EsploraAddress;
  const cs = info?.chain_stats;
  if (!cs) return null;
  const ms = info.mempool_stats ?? { funded_txo_sum: 0, spent_txo_sum: 0 };
  const sats = (cs.funded_txo_sum - cs.spent_txo_sum) + (ms.funded_txo_sum - ms.spent_txo_sum);
  if (sats <= 0) return null;
  return { chainId: 'bitcoin', contract: null, symbol: 'BTC', decimals: 8, rawBalance: String(sats) };
}
