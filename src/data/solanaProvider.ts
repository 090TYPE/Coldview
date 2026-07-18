import { getChain } from '../config/chains';
import { parseSolanaTokenAccounts, solanaNativeBalance } from './parseSolana';
import type { TokenBalance } from './types';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Solana RPC ${method} ${res.status}`);
  return res.json();
}

export async function fetchSolanaBalances(address: string): Promise<TokenBalance[]> {
  const url = getChain('solana').rpcUrl!;
  // Degrade each sub-call independently: a rate-limit on one must not discard the other.
  const [balR, tokR] = await Promise.allSettled([
    rpc(url, 'getBalance', [address]),
    rpc(url, 'getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM }, { encoding: 'jsonParsed' }]),
  ]);
  const out: TokenBalance[] = [];
  if (balR.status === 'fulfilled') {
    const native = solanaNativeBalance(balR.value?.result?.value ?? 0);
    if (native) out.push(native);
  }
  if (tokR.status === 'fulfilled') {
    out.push(...parseSolanaTokenAccounts(tokR.value?.result?.value ?? []));
  }
  return out;
}
