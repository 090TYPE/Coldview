import { getChain } from '../config/chains';
import { parseBlockscoutBalances, nativeBalance } from './parseBlockscout';
import { fetchSolanaBalances } from './solanaProvider';
import { fetchBitcoinBalance } from './bitcoinProvider';
import type { ChainId, TokenBalance } from './types';

async function fetchEvmBalances(address: string, chainId: ChainId): Promise<TokenBalance[]> {
  const chain = getChain(chainId);
  const base = chain.blockscoutBaseUrl!;

  const [tokensRes, coinRes] = await Promise.all([
    fetch(`${base}/api/v2/addresses/${address}/token-balances`),
    fetch(`${base}/api/v2/addresses/${address}`),
  ]);

  const tokens = tokensRes.ok ? parseBlockscoutBalances(await tokensRes.json(), chainId) : [];

  let native: TokenBalance[] = [];
  if (coinRes.ok) {
    const info = (await coinRes.json()) as { coin_balance?: string };
    if (info.coin_balance && info.coin_balance !== '0') {
      native = [nativeBalance(info.coin_balance, chainId, chain.nativeSymbol)];
    }
  }
  return [...native, ...tokens];
}

export async function fetchBalances(address: string, chainId: ChainId): Promise<TokenBalance[]> {
  const family = getChain(chainId).family;
  switch (family) {
    case 'solana':
      return fetchSolanaBalances(address);
    case 'bitcoin':
      return fetchBitcoinBalance(address);
    default:
      return fetchEvmBalances(address, chainId);
  }
}
