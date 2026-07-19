import { getChain } from '../config/chains';
import { parseSolanaNativeTransfer } from './parseTransfers';
import type { Transfer } from './types';

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Solana RPC ${method} ${res.status}`);
  return res.json();
}

// Recent native-SOL transfer history. Pulls the address's latest signatures,
// then fetches each transaction and nets the owner's lamport change.
export async function fetchSolanaTransfers(address: string): Promise<Transfer[]> {
  const url = getChain('solana').rpcUrl!;
  const sigRes = await rpc(url, 'getSignaturesForAddress', [address, { limit: 25 }]).catch(() => null);
  const sigs: { signature: string }[] = sigRes?.result ?? [];
  if (sigs.length === 0) return [];

  const results = await Promise.allSettled(
    sigs.map((s) =>
      rpc(url, 'getTransaction', [s.signature, { maxSupportedTransactionVersion: 0, encoding: 'jsonParsed' }]),
    ),
  );

  const out: Transfer[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.result) {
      const t = parseSolanaNativeTransfer(r.value.result, address, sigs[i].signature);
      if (t) out.push(t);
    }
  });
  return out;
}
