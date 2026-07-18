import type { ChainId, Transfer } from './types';

interface BsTokenTransfer {
  from?: { hash?: string };
  to?: { hash?: string };
  token?: { address?: string; symbol?: string | null; decimals?: string | null };
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
    });
  }
  return out;
}
