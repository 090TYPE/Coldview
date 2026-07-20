# ERC-20 Token Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a wallet's active ERC-20 token approvals (who can move your tokens) inside the P&L view, sourced keyless from Blockscout logs.

**Architecture:** A pure parser + network fetcher in `src/data/approvalsProvider.ts` (mirrors `gasProvider.ts`), a TanStack Query hook `src/state/useApprovals.ts` (mirrors `useGas.ts`), and a presentational `ApprovalsSection` rendered inside `PnlView.tsx`. Approvals come from the Etherscan-compatible Blockscout endpoint `/api?module=logs&action=getLogs` filtered by the `Approval` event signature (topic0) and the owner address (topic1). No RPC, no keys.

**Tech Stack:** React 19, TypeScript, TanStack Query, Vitest + Testing Library, Tailwind.

---

## Deviations from the design spec

1. **No decimals-based amount formatting.** `Holding` carries no `decimals`, and the log payload carries none either. Rather than an extra token-metadata request per token, allowances are shown as **Unlimited** (red badge) vs **Limited** (muted, raw integer in a tooltip). Token symbol still comes from a `holdings` match; unknown tokens show a shortened contract address. Precise decimals formatting is a possible future enhancement.
2. **`amount` stored as `string | null`** (not `bigint`) so the query cache stays JSON-serializable — same reasoning as `gasProvider` returning wei as strings. `null` means unlimited.

## Confirmed endpoint (validated live against base.blockscout.com on 2026-07-20)

Request:
```
GET {blockscoutBaseUrl}/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&topic0={APPROVAL_TOPIC0}&topic1={paddedOwner}&topic0_1_opr=and
```
Response shape:
```json
{ "message": "OK", "result": [
  { "address": "0x<token>", "data": "0x<value>", "blockNumber": "0x<hex>",
    "timeStamp": "0x<hex>", "transactionHash": "0x<hash>",
    "topics": ["0x8c5be1e5...", "0x000...<owner>", "0x000...<spender>", null] }
] }
```
`address` = token contract (log emitter). `topics[1]` = owner. `topics[2]` = spender. `data` = approved value.

## File structure

- **Create** `src/data/approvalsProvider.ts` — constants, `ownerToTopic`, `buildApprovalLogsUrl`, pure `parseApprovals`, network `fetchApprovalLogs`.
- **Create** `src/data/approvalsProvider.test.ts` — unit tests for `parseApprovals` + `ownerToTopic`.
- **Create** `src/state/useApprovals.ts` — TanStack Query hook.
- **Create** `src/state/useApprovals.test.tsx` — hook test with stubbed `fetch`.
- **Create** `src/components/ApprovalsSection.tsx` — presentational section + `formatAllowance` + `shortAddr` helpers.
- **Create** `src/components/ApprovalsSection.test.tsx` — component render tests.
- **Modify** `src/components/PnlView.tsx` — call `useApprovals`, render `<ApprovalsSection>`, and stop early-returning before approvals when there is no cost-basis history.
- **Add to** `src/data/types.ts` — `TokenApproval` interface.

---

## Task 1: Types + pure parser (`parseApprovals`, `ownerToTopic`)

**Files:**
- Modify: `src/data/types.ts` (append `TokenApproval`)
- Create: `src/data/approvalsProvider.ts`
- Test: `src/data/approvalsProvider.test.ts`

- [ ] **Step 1: Add the `TokenApproval` type**

Append to `src/data/types.ts`:

```ts
export interface TokenApproval {
  chainId: ChainId;
  owner: string;         // lowercased wallet that granted the approval
  tokenAddress: string;  // lowercased ERC-20 contract
  spender: string;       // lowercased approved spender
  amount: string | null; // decimal string of approved value; null = unlimited
  blockNumber: number;   // for latest-wins dedupe + recency sort
  txHash: string;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/data/approvalsProvider.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseApprovals, ownerToTopic, APPROVAL_TOPIC0 } from './approvalsProvider';

const OWNER = '0x' + 'a'.repeat(40);
const OWNER_TOPIC = '0x' + '0'.repeat(24) + 'a'.repeat(40);
const SPENDER_A = '0x' + 'b'.repeat(40);
const SPENDER_B = '0x' + 'c'.repeat(40);
const spenderTopic = (addr: string) => '0x' + '0'.repeat(24) + addr.slice(2);
const valueHex = (n: bigint) => '0x' + n.toString(16).padStart(64, '0');
const MAX_U256 = '0x' + 'f'.repeat(64);

function log(over: Partial<Record<string, unknown>> = {}) {
  return {
    address: '0x' + 'd'.repeat(40),
    data: valueHex(100n),
    blockNumber: '0xa',
    timeStamp: '0x10',
    transactionHash: '0x' + 'e'.repeat(64),
    topics: [APPROVAL_TOPIC0, OWNER_TOPIC, spenderTopic(SPENDER_A), null],
    ...over,
  };
}

describe('ownerToTopic', () => {
  it('left-pads a lowercased address to a 32-byte topic', () => {
    expect(ownerToTopic('0x' + 'A'.repeat(40))).toBe(OWNER_TOPIC);
  });
});

describe('parseApprovals', () => {
  it('keeps only the latest event per (token, spender)', () => {
    const rows = parseApprovals([
      log({ blockNumber: '0xa', data: valueHex(100n) }),
      log({ blockNumber: '0xb', data: valueHex(200n) }),
    ], OWNER);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: '200', spender: SPENDER_A, blockNumber: 11 });
  });

  it('flags max-uint256 (and huge values) as unlimited (null amount)', () => {
    const rows = parseApprovals([log({ data: MAX_U256 })], OWNER);
    expect(rows[0].amount).toBeNull();
  });

  it('drops an approval whose latest value is zero (already revoked)', () => {
    const rows = parseApprovals([
      log({ blockNumber: '0xa', data: valueHex(500n) }),
      log({ blockNumber: '0xb', data: valueHex(0n) }),
    ], OWNER);
    expect(rows).toHaveLength(0);
  });

  it('keeps different spenders on the same token as separate rows', () => {
    const rows = parseApprovals([
      log({ topics: [APPROVAL_TOPIC0, OWNER_TOPIC, spenderTopic(SPENDER_A), null] }),
      log({ topics: [APPROVAL_TOPIC0, OWNER_TOPIC, spenderTopic(SPENDER_B), null] }),
    ], OWNER);
    expect(rows.map((r) => r.spender).sort()).toEqual([SPENDER_A, SPENDER_B].sort());
  });

  it('skips malformed logs and non-array input', () => {
    expect(parseApprovals(null, OWNER)).toEqual([]);
    expect(parseApprovals([{ topics: [APPROVAL_TOPIC0, OWNER_TOPIC] }], OWNER)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/approvalsProvider.test.ts`
Expected: FAIL — module `./approvalsProvider` has no exports yet.

- [ ] **Step 4: Write minimal implementation**

Create `src/data/approvalsProvider.ts`:

```ts
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
  const latest = new Map<string, TokenApproval>();

  for (const item of raw as RawLog[]) {
    const t = item?.topics;
    if (!Array.isArray(t) || t.length < 3) continue;
    if ((t[0] ?? '').toLowerCase() !== APPROVAL_TOPIC0) continue;
    if (!item.address || !t[1] || !t[2] || item.data == null) continue;

    let value: bigint;
    let block: number;
    try {
      value = BigInt(item.data);
      block = parseInt(item.blockNumber ?? '0x0', 16);
    } catch {
      continue;
    }

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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/approvalsProvider.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/data/approvalsProvider.ts src/data/approvalsProvider.test.ts
git commit -m "feat(approvals): keyless ERC-20 approval log parser + Blockscout fetcher"
```

---

## Task 2: Query hook (`useApprovals`)

**Files:**
- Create: `src/state/useApprovals.ts`
- Test: `src/state/useApprovals.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/state/useApprovals.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useApprovals } from './useApprovals';
import { APPROVAL_TOPIC0 } from '../data/approvalsProvider';
import type { Wallet } from '../data/walletStore';

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const OWNER = '0x' + 'a'.repeat(40);
const OWNER_TOPIC = '0x' + '0'.repeat(24) + 'a'.repeat(40);
const SPENDER_TOPIC = '0x' + '0'.repeat(24) + 'b'.repeat(40);

describe('useApprovals', () => {
  it('loads and flattens active approvals for EVM wallets', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ message: 'OK', result: [
        { address: '0x' + 'd'.repeat(40), data: '0x' + 'f'.repeat(64),
          blockNumber: '0xa', transactionHash: '0x' + 'e'.repeat(64),
          topics: [APPROVAL_TOPIC0, OWNER_TOPIC, SPENDER_TOPIC, null] },
      ] }),
    } as Response)));

    const wallets: Wallet[] = [{ address: OWNER, label: 'Main', family: 'evm' }];
    const { result } = renderHook(() => useApprovals(wallets, ['ethereum'], true), { wrapper });
    await waitFor(() => expect(result.current.data?.length).toBe(1));
    expect(result.current.data![0]).toMatchObject({
      chainId: 'ethereum', amount: null, spender: '0x' + 'b'.repeat(40),
    });
  });

  it('is disabled with no wallets', () => {
    const { result } = renderHook(() => useApprovals([], ['ethereum'], true), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/useApprovals.test.tsx`
Expected: FAIL — module `./useApprovals` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/state/useApprovals.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchApprovalLogs } from '../data/approvalsProvider';
import type { ChainId, TokenApproval } from '../data/types';
import type { Wallet } from '../data/walletStore';

// Active ERC-20 approvals across all EVM wallet×chain pairs, flattened.
async function loadApprovals(wallets: Wallet[], chains: ChainId[]): Promise<TokenApproval[]> {
  const pairs = wallets.flatMap((w) =>
    chains
      .filter((c) => getChain(c).family === 'evm' && w.family === 'evm')
      .map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchApprovalLogs(p.address, p.chain)));
  const out: TokenApproval[] = [];
  for (const r of results) if (r.status === 'fulfilled') out.push(...r.value);
  return out;
}

export function useApprovals(wallets: Wallet[], chains: ChainId[], enabled: boolean) {
  return useQuery({
    queryKey: ['approvals', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadApprovals(wallets, chains),
    enabled: enabled && wallets.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/useApprovals.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/useApprovals.ts src/state/useApprovals.test.tsx
git commit -m "feat(approvals): useApprovals query hook (EVM pairs, flattened)"
```

---

## Task 3: `ApprovalsSection` component

**Files:**
- Create: `src/components/ApprovalsSection.tsx`
- Test: `src/components/ApprovalsSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ApprovalsSection.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApprovalsSection } from './ApprovalsSection';
import type { TokenApproval, Holding } from '../data/types';

const base: TokenApproval = {
  chainId: 'ethereum', owner: '0x' + 'a'.repeat(40),
  tokenAddress: '0x' + 'd'.repeat(40), spender: '0x' + 'b'.repeat(40),
  amount: null, blockNumber: 10, txHash: '0x' + 'e'.repeat(64),
};
const holdings: Holding[] = [
  { key: 'ethereum:0x' + 'd'.repeat(40), chainId: 'ethereum', symbol: 'USDC',
    amount: 5, priceUsd: 1, valueUsd: 5, change24hPct: null, iconUrl: null },
];

describe('ApprovalsSection', () => {
  it('shows the empty state when there are no approvals', () => {
    render(<ApprovalsSection approvals={[]} holdings={[]} isLoading={false} />);
    expect(screen.getByText(/No active token approvals/i)).toBeInTheDocument();
  });

  it('renders an unlimited approval with the token symbol from holdings', () => {
    render(<ApprovalsSection approvals={[base]} holdings={holdings} isLoading={false} />);
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText(/Unlimited/i)).toBeInTheDocument();
  });

  it('shows Limited for a finite approval and a revoke link', () => {
    render(<ApprovalsSection approvals={[{ ...base, amount: '1000' }]} holdings={[]} isLoading={false} />);
    expect(screen.getByText(/Limited/i)).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `https://revoke.cash/address/${base.owner}`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ApprovalsSection.test.tsx`
Expected: FAIL — module `./ApprovalsSection` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ApprovalsSection.tsx`:

```tsx
import { getChain } from '../config/chains';
import { Label, LoadingSkeleton } from './primitives';
import type { Holding, TokenApproval } from '../data/types';

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

interface Props {
  approvals: TokenApproval[];
  holdings: Holding[];
  isLoading: boolean;
}

export function ApprovalsSection({ approvals, holdings, isLoading }: Props) {
  const symbolByKey = new Map(holdings.map((h) => [h.key.toLowerCase(), h.symbol]));

  // Unlimited (highest risk) first, then most recent.
  const rows = [...approvals].sort((a, b) => {
    const au = a.amount === null ? 0 : 1;
    const bu = b.amount === null ? 0 : 1;
    if (au !== bu) return au - bu;
    return b.blockNumber - a.blockNumber;
  });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <Label>Token approvals</Label>
      </div>
      <p className="text-[11px] text-muted mb-2">
        Shows the last approved limit from on-chain logs — the actual remaining allowance may be lower.
      </p>
      {isLoading ? (
        <LoadingSkeleton />
      ) : rows.length === 0 ? (
        <div className="text-muted text-[12px] text-center py-6">No active token approvals found.</div>
      ) : (
        <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-muted text-[10px] uppercase tracking-widest">
                <th className="text-left p-2.5 border-b border-border">Asset</th>
                <th className="text-left p-2.5 border-b border-border">Spender</th>
                <th className="text-right p-2.5 border-b border-border">Allowance</th>
                <th className="text-left p-2.5 border-b border-border">Chain</th>
                <th className="text-right p-2.5 border-b border-border"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const symbol = symbolByKey.get(`${a.chainId}:${a.tokenAddress}`) ?? shortAddr(a.tokenAddress);
                return (
                  <tr key={`${a.chainId}:${a.tokenAddress}:${a.spender}`}>
                    <td className="p-2.5 border-b border-[#0f171e] font-bold text-[#e6eef3]">{symbol}</td>
                    <td className="p-2.5 border-b border-[#0f171e] font-mono text-[11px] text-muted">{shortAddr(a.spender)}</td>
                    <td className="p-2.5 border-b border-[#0f171e] text-right">
                      {a.amount === null ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-danger/50 text-danger">Unlimited</span>
                      ) : (
                        <span className="text-muted" title={`Approved value: ${a.amount} (raw, no decimals)`}>Limited</span>
                      )}
                    </td>
                    <td className="p-2.5 border-b border-[#0f171e] text-muted">{getChain(a.chainId).name}</td>
                    <td className="p-2.5 border-b border-[#0f171e] text-right">
                      <a
                        className="text-blue hover:underline"
                        href={`https://revoke.cash/address/${a.owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Review & revoke on revoke.cash (opens in a new tab)"
                      >
                        ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ApprovalsSection.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ApprovalsSection.tsx src/components/ApprovalsSection.test.tsx
git commit -m "feat(approvals): ApprovalsSection table (unlimited-first, revoke deeplink)"
```

---

## Task 4: Wire into `PnlView`

**Files:**
- Modify: `src/components/PnlView.tsx`

- [ ] **Step 1: Add imports**

In `src/components/PnlView.tsx`, add after the existing imports (near line 10):

```tsx
import { useApprovals } from '../state/useApprovals';
import { ApprovalsSection } from './ApprovalsSection';
```

- [ ] **Step 2: Call the hook**

In the `PnlView` component body, add after the `useGas` line (currently line 38):

```tsx
  const { data: approvals, isLoading: approvalsLoading } = useApprovals(wallets, enabledChains, true);
```

- [ ] **Step 3: Keep approvals visible when there is no cost-basis history**

Replace the early return block (currently lines 59-61):

```tsx
  if (rows.length === 0) {
    return <div className="text-muted text-[12px] text-center py-10">No cost-basis history found for these wallets.</div>;
  }
```

with a flag so the rest of the view (including approvals) still renders:

```tsx
  const noCostBasis = rows.length === 0;
```

Then, inside the returned fragment, wrap the tax-export button, summary grid, partial-history note, and P&L table so they only render when `!noCostBasis`, and add a plain note when `noCostBasis` is true. Concretely, immediately after `return (` and its opening `<>`, insert:

```tsx
      {noCostBasis && (
        <div className="text-muted text-[12px] text-center py-6">No cost-basis history found for these wallets.</div>
      )}
```

and change the three existing top-level blocks to be conditional. The tax-export block becomes:

```tsx
      {!noCostBasis && realizedEvents.length > 0 && (
```

The summary grid `<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">…</div>`, the `{hasPartial && (…)}` note, and the P&L table `<div className="bg-panel …">…</div>` must each be guarded. Wrap those three blocks together:

```tsx
      {!noCostBasis && (
        <>
          {/* existing summary grid, hasPartial note, and P&L table go here unchanged */}
        </>
      )}
```

- [ ] **Step 4: Render the approvals section**

Immediately before the closing `</>` of the returned fragment (after the P&L table's wrapper), add:

```tsx
      <ApprovalsSection approvals={approvals ?? []} holdings={holdings} isLoading={approvalsLoading} />
```

- [ ] **Step 5: Run PnlView-adjacent tests + typecheck**

Run: `npx vitest run src/components && npx tsc -b`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/PnlView.tsx
git commit -m "feat(approvals): show approvals section in P&L view (even without cost basis)"
```

---

## Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: PASS — all prior tests plus the ~11 new ones green.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `tsc -b` clean, Vite build writes `dist/` with no errors.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run: `npm run dev`, open http://localhost:5173, add `vitalik.eth`, open the **P&L** tab, and confirm a "Token approvals" section renders with rows (unlimited ones flagged red) and working ↗ links.

- [ ] **Step 5: Final commit if anything changed**

```bash
git add -A
git commit -m "chore(approvals): verification pass" --allow-empty
```

---

## Self-review notes

- **Spec coverage:** keyless log source (Task 1), ERC-20-only Approval topic (Task 1), P&L-section placement (Task 4), unlimited flagging + honesty note + revoke deeplink + empty state (Task 3), symbol enrichment from holdings (Task 3), EVM-only pairs + graceful skip via `Promise.allSettled` (Task 2), pure-parser unit tests (Task 1). All covered.
- **Deviations** from spec are documented at the top (no decimals formatting; `amount` as `string | null`).
- **Type consistency:** `TokenApproval` fields (`chainId`, `owner`, `tokenAddress`, `spender`, `amount`, `blockNumber`, `txHash`) are used identically across Tasks 1–4. `fetchApprovalLogs` fills `chainId`; `parseApprovals` leaves it empty by design.
