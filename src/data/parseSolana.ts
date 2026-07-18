import type { TokenBalance } from './types';

interface ParsedTokenAccount {
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: { amount: string; decimals: number };
        };
      };
    };
  };
}

// SPL symbol is not in the RPC response; leave it empty and fill from the
// DefiLlama price response later (falling back to a truncated mint).
export function parseSolanaTokenAccounts(raw: unknown): TokenBalance[] {
  if (!Array.isArray(raw)) return [];
  const out: TokenBalance[] = [];
  for (const item of raw as ParsedTokenAccount[]) {
    const info = item?.account?.data?.parsed?.info;
    if (!info || !info.tokenAmount || info.tokenAmount.amount === '0') continue;
    out.push({
      chainId: 'solana',
      contract: info.mint,
      symbol: '',
      decimals: info.tokenAmount.decimals,
      rawBalance: info.tokenAmount.amount,
    });
  }
  return out;
}

export function solanaNativeBalance(lamports: number): TokenBalance | null {
  if (!lamports || lamports <= 0) return null;
  return { chainId: 'solana', contract: null, symbol: 'SOL', decimals: 9, rawBalance: String(lamports) };
}
