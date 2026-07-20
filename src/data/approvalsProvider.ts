import { getChain } from '../config/chains';
import type { ChainId, TokenApproval } from './types';

// keccak256("Approval(address,address,uint256)")
export const APPROVAL_TOPIC0 =
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

// Anything at/above this is treated as an effectively-unlimited allowance.
const UNLIMITED_THRESHOLD = 2n ** 255n;

// 20-byte address -> left-padded 32-byte log topic, lowercased.
export function ownerToTopic(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, '');
  return '0x' + hex.padStart(64, '0');
}

function topicToAddress(topic: string): string {
  return '0x' + topic.slice(-40).toLowerCase();
}

interface RawLog {
  address?: string;
  data?: string;
  blockNumber?: string;
  transactionHash?: string;
  topics?: (string | null)[];
}

// Pure: reduce raw Approval logs to the current active approval per (token, spender).
export function parseApprovals(raw: unknown, owner: string): TokenApproval[] {
  if (!Array.isArray(raw)) return [];
  const ownerLc = owner.toLowerCase();
  const ownerTopic = ownerToTopic(ownerLc);
  const latest = new Map<string, TokenApproval>();

  for (const item of raw as RawLog[]) {
    const t = item?.topics;
    if (!Array.isArray(t) || t.length < 3) continue;
    if ((t[0] ?? '').toLowerCase() !== APPROVAL_TOPIC0) continue;
    if ((t[1] ?? '').toLowerCase() !== ownerTopic) continue;
    if (!item.address || !t[1] || !t[2] || item.data == null) continue;

    let value: bigint;
    let block: number;
    try {
      value = BigInt(item.data);
      block = parseInt(item.blockNumber ?? '', 16);
    } catch {
      continue;
    }
    if (Number.isNaN(block)) continue;

    const token = item.address.toLowerCase();
    const spender = topicToAddress(t[2]);
    const key = `${token}:${spender}`;
    const prev = latest.get(key);
    if (prev && prev.blockNumber >= block) continue;

    latest.set(key, {
      chainId: '' as ChainId, // filled by fetchApprovalLogs (per-chain call)
      owner: ownerLc,
      tokenAddress: token,
      spender,
      amount: value >= UNLIMITED_THRESHOLD ? null : value.toString(),
      blockNumber: block,
      txHash: item.transactionHash ?? '',
    });
  }

  // Drop fully-revoked approvals (latest value is exactly zero).
  return [...latest.values()].filter((a) => a.amount !== '0');
}

export function buildApprovalLogsUrl(base: string, owner: string): string {
  const params = new URLSearchParams({
    module: 'logs',
    action: 'getLogs',
    fromBlock: '0',
    toBlock: 'latest',
    topic0: APPROVAL_TOPIC0,
    topic1: ownerToTopic(owner),
    topic0_1_opr: 'and',
  });
  return `${base}/api?${params.toString()}`;
}

// Network: fetch owner's Approval logs from one chain's Blockscout instance.
export async function fetchApprovalLogs(address: string, chainId: ChainId): Promise<TokenApproval[]> {
  const base = getChain(chainId).blockscoutBaseUrl;
  if (!base) return [];
  let json: { result?: unknown };
  try {
    const res = await fetch(buildApprovalLogsUrl(base, address));
    if (!res.ok) return [];
    json = (await res.json()) as { result?: unknown };
  } catch {
    return [];
  }
  return parseApprovals(json.result, address).map((a) => ({ ...a, chainId }));
}
