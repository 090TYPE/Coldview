import type { ChainId, Transfer } from './types';

interface BsTokenTransfer {
  from?: { hash?: string };
  to?: { hash?: string };
  token?: { address?: string; symbol?: string | null; decimals?: string | null; icon_url?: string | null };
  total?: { value?: string; decimals?: string | null };
  tx_hash?: string;
  timestamp?: string;
}
interface BsTxn {
  hash?: string;
  from?: { hash?: string };
  to?: { hash?: string };
  value?: string;
  timestamp?: string;
  status?: string;
}

function secs(iso?: string): number {
  return iso ? Math.floor(Date.parse(iso) / 1000) : 0;
}

export function parseTokenTransfers(raw: unknown, chainId: ChainId, owner: string): Transfer[] {
  const items = (raw as { items?: BsTokenTransfer[] })?.items;
  if (!Array.isArray(items)) return [];
  const o = owner.toLowerCase();
  const out: Transfer[] = [];
  for (const it of items) {
    const from = it.from?.hash?.toLowerCase();
    const to = it.to?.hash?.toLowerCase();
    const value = it.total?.value;
    if (!from || !to || !value || value === '0' || !it.token?.address) continue;
    const direction: 'in' | 'out' = to === o ? 'in' : 'out';
    out.push({
      chainId,
      txHash: it.tx_hash ?? '',
      timestamp: secs(it.timestamp),
      direction,
      symbol: it.token.symbol ?? '???',
      contract: it.token.address.toLowerCase(),
      decimals: Number(it.token.decimals ?? it.total?.decimals ?? 18),
      rawAmount: value,
      counterparty: direction === 'in' ? from : to,
      iconUrl: it.token.icon_url ?? null,
    });
  }
  return out;
}

export function parseNativeTxs(raw: unknown, chainId: ChainId, owner: string, nativeSymbol: string): Transfer[] {
  const items = (raw as { items?: BsTxn[] })?.items;
  if (!Array.isArray(items)) return [];
  const o = owner.toLowerCase();
  const out: Transfer[] = [];
  for (const it of items) {
    const from = it.from?.hash?.toLowerCase();
    const to = it.to?.hash?.toLowerCase();
    if (!from || !to || !it.value || it.value === '0') continue;
    if (it.status === 'error') continue; // reverted tx: funds never moved
    const direction: 'in' | 'out' = to === o ? 'in' : 'out';
    out.push({
      chainId,
      txHash: it.hash ?? '',
      timestamp: secs(it.timestamp),
      direction,
      symbol: nativeSymbol,
      contract: null,
      decimals: 18,
      rawAmount: it.value,
      counterparty: direction === 'in' ? from : to,
      iconUrl: null,
    });
  }
  return out;
}

// --- Bitcoin (esplora /address/:addr/txs) ---
interface BtcVin { prevout?: { scriptpubkey_address?: string; value?: number } }
interface BtcVout { scriptpubkey_address?: string; value?: number }
interface BtcTx { txid?: string; status?: { block_time?: number }; vin?: BtcVin[]; vout?: BtcVout[] }

// Net the value flowing to/from the owner across a tx's inputs and outputs.
// Bitcoin addresses are case-sensitive, so `owner` is compared as-is.
export function parseBitcoinTxs(raw: unknown, owner: string): Transfer[] {
  const txs = raw as BtcTx[];
  if (!Array.isArray(txs)) return [];
  const out: Transfer[] = [];
  for (const tx of txs) {
    const spent = (tx.vin ?? []).reduce((s, v) => s + (v.prevout?.scriptpubkey_address === owner ? v.prevout.value ?? 0 : 0), 0);
    const received = (tx.vout ?? []).reduce((s, v) => s + (v.scriptpubkey_address === owner ? v.value ?? 0 : 0), 0);
    const net = received - spent;
    if (net === 0) continue;
    const direction: 'in' | 'out' = net > 0 ? 'in' : 'out';
    const counterparty =
      (direction === 'in'
        ? (tx.vin ?? []).map((v) => v.prevout?.scriptpubkey_address).find((a) => a && a !== owner)
        : (tx.vout ?? []).map((v) => v.scriptpubkey_address).find((a) => a && a !== owner)) ?? '';
    out.push({
      chainId: 'bitcoin', txHash: tx.txid ?? '', timestamp: tx.status?.block_time ?? 0,
      direction, symbol: 'BTC', contract: null, decimals: 8, rawAmount: String(Math.abs(net)),
      counterparty, iconUrl: null,
    });
  }
  return out;
}

// --- Solana (getTransaction, native SOL only) ---
interface SolTx {
  blockTime?: number;
  transaction?: { message?: { accountKeys?: (string | { pubkey: string })[] } };
  meta?: { preBalances?: number[]; postBalances?: number[] };
}

// Owner's net lamport change for one transaction. SPL-token history is out of
// scope (those touch a separate token account not returned by a wallet's
// signature list), so this covers native SOL transfers only.
export function parseSolanaNativeTransfer(raw: unknown, owner: string, signature: string): Transfer | null {
  const tx = raw as SolTx;
  const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) => (typeof k === 'string' ? k : k.pubkey));
  const idx = keys.indexOf(owner);
  if (idx < 0 || !tx.meta?.preBalances || !tx.meta?.postBalances) return null;
  const delta = (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
  if (delta === 0) return null;
  return {
    chainId: 'solana', txHash: signature, timestamp: tx.blockTime ?? 0,
    direction: delta > 0 ? 'in' : 'out', symbol: 'SOL', contract: null, decimals: 9,
    rawAmount: String(Math.abs(delta)), counterparty: '', iconUrl: null,
  };
}
