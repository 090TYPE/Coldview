# Coldview Phase 3 Implementation Plan (Activity + flow-based P&L)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an EVM transaction **Activity** view with USD-value-at-time and an honest flow-based "invested vs current" summary — all client-only and keyless.

**Architecture:** New pure data units (`parseTransfers`, `activity`) + a Blockscout transfer provider + a DefiLlama historical-price service with a permanent IndexedDB cache, surfaced by a `useActivity` TanStack Query hook and an Activity view toggled from the top bar. The Portfolio view is untouched.

**Tech Stack:** Existing (React 19, TS, Vite, Tailwind, Zustand, TanStack Query, idb-keyval, Vitest, Playwright). Data: Blockscout transfer endpoints + DefiLlama historical prices — keyless + CORS.

---

## File Structure

**New:**
```
src/data/parseTransfers.ts        # Blockscout token-transfers/transactions -> Transfer[]
src/data/txProvider.ts            # fetchTransfers(address, chainId)
src/data/historicalPrice.ts       # llamaKey/cacheKeyFor + hydrateHistoricalUsd (idb-cached)
src/data/activity.ts              # buildActivity + computeFlows (pure)
src/state/useActivity.ts          # TanStack Query hook
src/components/ActivityTable.tsx
src/components/FlowsSummary.tsx
src/components/ActivityView.tsx
tests/fixtures/blockscout-token-transfers.json
tests/fixtures/blockscout-transactions.json
tests/e2e/activity.spec.ts
```
**Modified:**
```
src/data/types.ts                 # + Transfer, ActivityRow, FlowRow
src/state/store.ts                # + view state ('portfolio'|'activity') + setView
src/components/TopBar.tsx         # + Portfolio/Activity toggle
src/App.tsx                       # render ActivityView when view === 'activity'
```

---

## Task 1: Transfer types + Blockscout transfer parsers

**Files:** Modify `src/data/types.ts`; Create `src/data/parseTransfers.ts`, fixtures, `src/data/parseTransfers.test.ts`.

- [ ] **Step 1: Create `tests/fixtures/blockscout-token-transfers.json`:**
```json
{
  "items": [
    {
      "from": { "hash": "0xSENDER0000000000000000000000000000000001" },
      "to": { "hash": "0xOWNER00000000000000000000000000000000000" },
      "token": { "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "symbol": "USDC", "decimals": "6" },
      "total": { "value": "3120000", "decimals": "6" },
      "tx_hash": "0xtx1",
      "timestamp": "2026-06-01T10:00:00.000000Z"
    },
    {
      "from": { "hash": "0xOWNER00000000000000000000000000000000000" },
      "to": { "hash": "0xRECEIVER000000000000000000000000000000002" },
      "token": { "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "symbol": "USDC", "decimals": "6" },
      "total": { "value": "1000000", "decimals": "6" },
      "tx_hash": "0xtx2",
      "timestamp": "2026-06-02T12:00:00.000000Z"
    }
  ]
}
```

- [ ] **Step 2: Create `tests/fixtures/blockscout-transactions.json`:**
```json
{
  "items": [
    { "hash": "0xtx3", "from": { "hash": "0xSENDER0000000000000000000000000000000001" }, "to": { "hash": "0xOWNER00000000000000000000000000000000000" }, "value": "1000000000000000000", "timestamp": "2026-06-03T09:00:00.000000Z" },
    { "hash": "0xtx4", "from": { "hash": "0xOWNER00000000000000000000000000000000000" }, "to": { "hash": "0xCONTRACT00000000000000000000000000000003" }, "value": "0", "timestamp": "2026-06-04T09:00:00.000000Z" }
  ]
}
```

- [ ] **Step 3: Write the failing test `src/data/parseTransfers.test.ts`:**
```ts
import { describe, it, expect } from 'vitest';
import tokenFixture from '../../tests/fixtures/blockscout-token-transfers.json';
import txFixture from '../../tests/fixtures/blockscout-transactions.json';
import { parseTokenTransfers, parseNativeTxs } from './parseTransfers';

const OWNER = '0xOWNER00000000000000000000000000000000000';

describe('parseTokenTransfers', () => {
  it('normalizes transfers with correct direction and counterparty', () => {
    const out = parseTokenTransfers(tokenFixture, 'ethereum', OWNER);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      chainId: 'ethereum', txHash: '0xtx1', direction: 'in', symbol: 'USDC',
      contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, rawAmount: '3120000',
      counterparty: '0xsender0000000000000000000000000000000001',
    });
    expect(out[1]).toMatchObject({ direction: 'out', counterparty: '0xreceiver000000000000000000000000000000002' });
    expect(out[0].timestamp).toBe(Math.floor(Date.parse('2026-06-01T10:00:00Z') / 1000));
  });
});

describe('parseNativeTxs', () => {
  it('keeps value-bearing native txs and skips zero-value calls', () => {
    const out = parseNativeTxs(txFixture, 'ethereum', OWNER, 'ETH');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ txHash: '0xtx3', direction: 'in', symbol: 'ETH', contract: null, decimals: 18, rawAmount: '1000000000000000000' });
  });
});
```

- [ ] **Step 4: Run → FAIL.** `npx vitest run src/data/parseTransfers.test.ts`

- [ ] **Step 5: Add types to `src/data/types.ts`** — append at the end of the file:
```ts
export interface Transfer {
  chainId: ChainId;
  txHash: string;
  timestamp: number; // unix seconds
  direction: 'in' | 'out';
  symbol: string;
  contract: string | null;
  decimals: number;
  rawAmount: string;
  counterparty: string; // lowercased other-party address
}

export interface ActivityRow extends Transfer {
  usdAtTime: number | null;
}

export interface FlowRow {
  symbol: string;
  investedUsd: number;
  currentUsd: number;
  gainUsd: number;
}
```

- [ ] **Step 6: Create `src/data/parseTransfers.ts`:**
```ts
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
```

- [ ] **Step 7: Run → PASS.** `npx vitest run src/data/parseTransfers.test.ts`, then `npm test`.

- [ ] **Step 8: Commit.**
```bash
git add src/data/types.ts src/data/parseTransfers.ts src/data/parseTransfers.test.ts tests/fixtures/blockscout-token-transfers.json tests/fixtures/blockscout-transactions.json
git commit -m "feat(data): Transfer types + Blockscout transfer/native-tx parsers"
```

---

## Task 2: Transfer fetch provider

**Files:** Create `src/data/txProvider.ts`, `src/data/txProvider.test.ts`.

- [ ] **Step 1: Write the failing test `src/data/txProvider.test.ts`:**
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchTransfers } from './txProvider';

afterEach(() => vi.restoreAllMocks());

describe('fetchTransfers', () => {
  it('merges token + native transfers and sorts by timestamp desc', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/token-transfers')) {
        return { ok: true, json: async () => ({ items: [
          { from: { hash: '0xa' }, to: { hash: '0xOWNER' }, token: { address: '0xUSDC', symbol: 'USDC', decimals: '6' }, total: { value: '1000000' }, tx_hash: '0xt1', timestamp: '2026-06-05T00:00:00Z' },
        ] }) } as Response;
      }
      return { ok: true, json: async () => ({ items: [
        { hash: '0xt2', from: { hash: '0xb' }, to: { hash: '0xOWNER' }, value: '1000000000000000000', timestamp: '2026-06-10T00:00:00Z' },
      ] }) } as Response;
    }));
    const out = await fetchTransfers('0xOWNER', 'ethereum');
    expect(out.map((t) => t.txHash)).toEqual(['0xt2', '0xt1']); // newest first
    expect(out.map((t) => t.symbol).sort()).toEqual(['ETH', 'USDC']);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/data/txProvider.test.ts`

- [ ] **Step 3: Create `src/data/txProvider.ts`:**
```ts
import { getChain } from '../config/chains';
import { parseTokenTransfers, parseNativeTxs } from './parseTransfers';
import type { ChainId, Transfer } from './types';

export async function fetchTransfers(address: string, chainId: ChainId): Promise<Transfer[]> {
  const chain = getChain(chainId);
  const base = chain.blockscoutBaseUrl!;
  const [tokRes, txRes] = await Promise.allSettled([
    fetch(`${base}/api/v2/addresses/${address}/token-transfers`),
    fetch(`${base}/api/v2/addresses/${address}/transactions`),
  ]);
  const out: Transfer[] = [];
  if (tokRes.status === 'fulfilled' && tokRes.value.ok) {
    out.push(...parseTokenTransfers(await tokRes.value.json(), chainId, address));
  }
  if (txRes.status === 'fulfilled' && txRes.value.ok) {
    out.push(...parseNativeTxs(await txRes.value.json(), chainId, address, chain.nativeSymbol));
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/data/txProvider.test.ts`

- [ ] **Step 5: Commit.**
```bash
git add src/data/txProvider.ts src/data/txProvider.test.ts
git commit -m "feat(data): Blockscout transfer fetch provider"
```

---

## Task 3: Historical price service (idb-cached)

**Files:** Create `src/data/historicalPrice.ts`, `src/data/historicalPrice.test.ts`.

- [ ] **Step 1: Write the failing test `src/data/historicalPrice.test.ts`:**
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { llamaKey, cacheKeyFor, hydrateHistoricalUsd } from './historicalPrice';
import type { Transfer } from './types';

afterEach(() => vi.restoreAllMocks());

const tf = (p: Partial<Transfer>): Transfer => ({
  chainId: 'ethereum', txHash: '0x', timestamp: 1_717_200_000, direction: 'in',
  symbol: 'USDC', contract: '0xusdc', decimals: 6, rawAmount: '0', counterparty: '0xx', ...p,
});

describe('llamaKey', () => {
  it('maps native by coingecko id and token by chain:contract', () => {
    expect(llamaKey('ethereum', null, 'ETH')).toBe('coingecko:ethereum');
    expect(llamaKey('ethereum', '0xUSDC', 'USDC')).toBe('ethereum:0xusdc');
  });
});

describe('cacheKeyFor', () => {
  it('floors the timestamp to the day', () => {
    const t = tf({ timestamp: 1_717_200_123 });
    const day = Math.floor(1_717_200_123 / 86400) * 86400;
    expect(cacheKeyFor(t)).toBe(`ethereum:0xusdc@${day}`);
  });
});

describe('hydrateHistoricalUsd', () => {
  it('fetches a missing price, caches it, and de-dupes repeat (key,day)', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ coins: { 'ethereum:0xusdc': { price: 1 } } }),
    } as Response));
    vi.stubGlobal('fetch', fetchMock);
    const day = 1_717_200_000;
    const transfers = [tf({ timestamp: day + 5 }), tf({ timestamp: day + 9 })]; // same day -> 1 fetch
    const map = await hydrateHistoricalUsd(transfers);
    expect(map.get(cacheKeyFor(transfers[0]))).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/data/historicalPrice.test.ts`

- [ ] **Step 3: Create `src/data/historicalPrice.ts`:**
```ts
import { get, set } from 'idb-keyval';
import type { ChainId, Transfer } from './types';

const NATIVE_CG: Record<string, string> = { ETH: 'ethereum', POL: 'matic-network', SOL: 'solana', BTC: 'bitcoin' };
const DAY = 86400;

export function llamaKey(chainId: ChainId, contract: string | null, symbol: string): string | null {
  if (contract === null) {
    const cg = NATIVE_CG[symbol];
    return cg ? `coingecko:${cg}` : null;
  }
  if (chainId === 'solana') return `solana:${contract}`;
  return `${chainId}:${contract.toLowerCase()}`;
}

export function cacheKeyFor(t: Transfer): string | null {
  const k = llamaKey(t.chainId, t.contract, t.symbol);
  if (!k) return null;
  const day = Math.floor(t.timestamp / DAY) * DAY;
  return `${k}@${day}`;
}

async function fetchHistorical(llamaK: string, unixTs: number): Promise<number | null> {
  const res = await fetch(`https://coins.llama.fi/prices/historical/${unixTs}/${llamaK}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { coins?: Record<string, { price?: number }> };
  const p = data.coins?.[llamaK]?.price;
  return typeof p === 'number' ? p : null;
}

// Returns Map<cacheKeyFor(t), unit USD price>. Only found prices are present.
// Historical prices are immutable so cache them permanently in IndexedDB.
export async function hydrateHistoricalUsd(transfers: Transfer[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const need = new Map<string, { llamaK: string; unixTs: number }>();
  for (const t of transfers) {
    const ck = cacheKeyFor(t);
    if (!ck || need.has(ck)) continue;
    const llamaK = llamaKey(t.chainId, t.contract, t.symbol)!;
    need.set(ck, { llamaK, unixTs: Math.floor(t.timestamp / DAY) * DAY });
  }
  for (const [ck, { llamaK, unixTs }] of need) {
    const cached = await get<number>(`hist:${ck}`);
    if (typeof cached === 'number') {
      result.set(ck, cached);
      continue;
    }
    const price = await fetchHistorical(llamaK, unixTs);
    if (price !== null) {
      await set(`hist:${ck}`, price);
      result.set(ck, price);
    }
  }
  return result;
}
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/data/historicalPrice.test.ts`

- [ ] **Step 5: Commit.**
```bash
git add src/data/historicalPrice.ts src/data/historicalPrice.test.ts
git commit -m "feat(data): DefiLlama historical price service with permanent IndexedDB cache"
```

---

## Task 4: Activity + flows (pure)

**Files:** Create `src/data/activity.ts`, `src/data/activity.test.ts`.

- [ ] **Step 1: Write the failing test `src/data/activity.test.ts`:**
```ts
import { describe, it, expect } from 'vitest';
import { buildActivity, computeFlows } from './activity';
import { cacheKeyFor } from './historicalPrice';
import type { Transfer } from './types';

const tf = (p: Partial<Transfer>): Transfer => ({
  chainId: 'ethereum', txHash: '0x', timestamp: 1_717_200_000, direction: 'in',
  symbol: 'ETH', contract: null, decimals: 18, rawAmount: '1000000000000000000', counterparty: '0xother', ...p,
});

describe('buildActivity', () => {
  it('attaches usdAtTime = amount * unit price, or null when missing', () => {
    const t = tf({});
    const map = new Map<string, number>([[cacheKeyFor(t)!, 3000]]);
    const [row] = buildActivity([t], map);
    expect(row.usdAtTime).toBeCloseTo(3000, 6); // 1 ETH * $3000
    const t2 = tf({ symbol: 'ZZZ', contract: '0xzzz' });
    const [row2] = buildActivity([t2], new Map());
    expect(row2.usdAtTime).toBeNull();
  });
});

describe('computeFlows', () => {
  it('nets invested = in - out, excludes self-transfers and priceless rows, computes gain', () => {
    const rows = [
      { ...tf({ direction: 'in' }), usdAtTime: 1000 },
      { ...tf({ direction: 'out' }), usdAtTime: 400 },
      { ...tf({ direction: 'in', counterparty: '0xmine' }), usdAtTime: 5000 }, // self-transfer, excluded
      { ...tf({ direction: 'in' }), usdAtTime: null }, // priceless, excluded
    ];
    const owned = new Set<string>(['0xmine']);
    const current = new Map<string, number>([['ETH', 900]]);
    const flows = computeFlows(rows, owned, current);
    const eth = flows.perToken.find((r) => r.symbol === 'ETH')!;
    expect(eth.investedUsd).toBeCloseTo(600, 6); // 1000 - 400
    expect(eth.currentUsd).toBe(900);
    expect(eth.gainUsd).toBeCloseTo(300, 6);
    expect(flows.totalInvested).toBeCloseTo(600, 6);
    expect(flows.totalGain).toBeCloseTo(300, 6);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/data/activity.test.ts`

- [ ] **Step 3: Create `src/data/activity.ts`:**
```ts
import { toAmount } from './types';
import { cacheKeyFor } from './historicalPrice';
import type { Transfer, ActivityRow, FlowRow } from './types';

export function buildActivity(transfers: Transfer[], unitUsdByCacheKey: Map<string, number>): ActivityRow[] {
  return transfers.map((t) => {
    const ck = cacheKeyFor(t);
    const unit = ck ? unitUsdByCacheKey.get(ck) : undefined;
    const usdAtTime = unit !== undefined ? toAmount(t.rawAmount, t.decimals) * unit : null;
    return { ...t, usdAtTime };
  });
}

export function computeFlows(
  rows: ActivityRow[],
  ownedAddresses: Set<string>,
  currentUsdBySymbol: Map<string, number>,
): { perToken: FlowRow[]; totalInvested: number; totalCurrent: number; totalGain: number } {
  const invested = new Map<string, number>();
  for (const r of rows) {
    if (r.usdAtTime === null) continue;
    if (ownedAddresses.has(r.counterparty)) continue; // moving your own funds is not a buy/sell
    const cur = invested.get(r.symbol) ?? 0;
    invested.set(r.symbol, cur + (r.direction === 'in' ? r.usdAtTime : -r.usdAtTime));
  }
  const symbols = new Set<string>([...invested.keys(), ...currentUsdBySymbol.keys()]);
  const perToken: FlowRow[] = [];
  for (const symbol of symbols) {
    const investedUsd = invested.get(symbol) ?? 0;
    const currentUsd = currentUsdBySymbol.get(symbol) ?? 0;
    if (investedUsd === 0 && currentUsd === 0) continue;
    perToken.push({ symbol, investedUsd, currentUsd, gainUsd: currentUsd - investedUsd });
  }
  perToken.sort((a, b) => b.currentUsd - a.currentUsd);
  const totalInvested = perToken.reduce((s, r) => s + r.investedUsd, 0);
  const totalCurrent = perToken.reduce((s, r) => s + r.currentUsd, 0);
  return { perToken, totalInvested, totalCurrent, totalGain: totalCurrent - totalInvested };
}
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/data/activity.test.ts`

- [ ] **Step 5: Commit.**
```bash
git add src/data/activity.ts src/data/activity.test.ts
git commit -m "feat(data): buildActivity + computeFlows (flow-based invested vs current)"
```

---

## Task 5: useActivity hook

**Files:** Create `src/state/useActivity.ts`, `src/state/useActivity.test.tsx`.

- [ ] **Step 1: Write the failing test `src/state/useActivity.test.tsx`:**
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useActivity } from './useActivity';
import type { Wallet } from '../data/walletStore';

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useActivity', () => {
  it('loads EVM transfers with historical USD', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/token-transfers')) {
        return { ok: true, json: async () => ({ items: [
          { from: { hash: '0xa' }, to: { hash: '0x' + 'a'.repeat(40) }, token: { address: '0xUSDC', symbol: 'USDC', decimals: '6' }, total: { value: '1000000' }, tx_hash: '0xt1', timestamp: '2026-06-01T00:00:00Z' },
        ] }) } as Response;
      }
      if (url.includes('/transactions')) {
        return { ok: true, json: async () => ({ items: [] }) } as Response;
      }
      // DefiLlama historical
      return { ok: true, json: async () => ({ coins: { 'ethereum:0xusdc': { price: 1 } } }) } as Response;
    }));

    const wallets: Wallet[] = [{ address: '0x' + 'a'.repeat(40), label: 'Main', family: 'evm' }];
    const { result } = renderHook(() => useActivity(wallets, ['ethereum'], true), { wrapper });
    await waitFor(() => expect(result.current.data?.length).toBe(1));
    expect(result.current.data![0]).toMatchObject({ symbol: 'USDC', direction: 'in', usdAtTime: 1 });
  });
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/state/useActivity.test.tsx`

- [ ] **Step 3: Create `src/state/useActivity.ts`:**
```ts
import { useQuery } from '@tanstack/react-query';
import { getChain } from '../config/chains';
import { fetchTransfers } from '../data/txProvider';
import { hydrateHistoricalUsd } from '../data/historicalPrice';
import { buildActivity } from '../data/activity';
import type { ChainId, Transfer, ActivityRow } from '../data/types';
import type { Wallet } from '../data/walletStore';

async function loadActivity(wallets: Wallet[], chains: ChainId[]): Promise<ActivityRow[]> {
  const pairs = wallets.flatMap((w) =>
    chains
      .filter((c) => getChain(c).family === 'evm' && w.family === 'evm')
      .map((c) => ({ address: w.address, chain: c })),
  );
  const results = await Promise.allSettled(pairs.map((p) => fetchTransfers(p.address, p.chain)));
  const transfers: Transfer[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  transfers.sort((a, b) => b.timestamp - a.timestamp);
  const usd = await hydrateHistoricalUsd(transfers);
  return buildActivity(transfers, usd);
}

export function useActivity(wallets: Wallet[], chains: ChainId[], enabled: boolean) {
  return useQuery({
    queryKey: ['activity', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadActivity(wallets, chains),
    enabled: enabled && wallets.length > 0,
    staleTime: 60_000,
    retry: 1,
  });
}
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/state/useActivity.test.tsx`

- [ ] **Step 5: Commit.**
```bash
git add src/state/useActivity.ts src/state/useActivity.test.tsx
git commit -m "feat(state): useActivity hook (EVM transfers + historical USD)"
```

---

## Task 6: view state + TopBar toggle

**Files:** Modify `src/state/store.ts`, `src/components/TopBar.tsx`; Test `src/components/TopBar.test.tsx` (new).

- [ ] **Step 1: Write the failing test `src/components/TopBar.test.tsx`:**
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from './TopBar';

describe('TopBar view toggle', () => {
  it('switches to activity when the Activity tab is clicked', async () => {
    const onView = vi.fn();
    render(
      <TopBar wallets={[]} onAdd={vi.fn()} onRemove={vi.fn()} apiKey="" onApiKey={vi.fn()} view="portfolio" onView={onView} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /activity/i }));
    expect(onView).toHaveBeenCalledWith('activity');
  });
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/components/TopBar.test.tsx`

- [ ] **Step 3: Add view state to `src/state/store.ts`** — add `export type View = 'portfolio' | 'activity';`, add `view: View;` and `setView: (v: View) => void;` to the `AppState` interface, initialise `view: 'portfolio',` in the store body, and add the action `setView: (view) => set({ view }),`.

- [ ] **Step 4: Replace `src/components/TopBar.tsx` with:**
```tsx
import { WalletManager } from './WalletManager';
import { ApiKeyControl } from './ApiKeyControl';
import type { Wallet } from '../data/walletStore';
import type { View } from '../state/store';

interface Props {
  wallets: Wallet[];
  onAdd: (address: string, label: string) => void;
  onRemove: (address: string) => void;
  apiKey: string;
  onApiKey: (k: string) => void;
  view: View;
  onView: (v: View) => void;
}

export function TopBar({ wallets, onAdd, onRemove, apiKey, onApiKey, view, onView }: Props) {
  const tab = (v: View, label: string) => (
    <button
      onClick={() => onView(v)}
      className={`text-[12px] px-3 py-1 rounded-full border ${
        view === v ? 'border-neon text-neon bg-neon/10' : 'border-border text-[#9fb0bd]'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center justify-between mb-3.5 gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="font-extrabold text-[#eafff6] tracking-wide">◈ Coldview<span className="text-neon">.</span></div>
        <div className="flex gap-1">{tab('portfolio', 'Portfolio')}{tab('activity', 'Activity')}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <WalletManager wallets={wallets} onAdd={onAdd} onRemove={onRemove} />
        <ApiKeyControl value={apiKey} onChange={onApiKey} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run → PASS.** `npx vitest run src/components/TopBar.test.tsx`. Then `npm run build` — the App still passes `view`/`onView`? Not yet (Task 8 wires App). The build will fail on `App.tsx` missing the new required props. That is expected; Task 8 fixes it. To keep this task's build green in isolation, temporarily also do Task 8's App change now is NOT required — instead, run only the unit test here and defer `npm run build` to Task 8. Run `npm test` (unit) which does not type-check App against TopBar props at runtime; if `npm test` fails purely on the TS prop mismatch, proceed — Task 8 immediately follows and restores a green build. (Do not weaken anything; just don't block on the build between these two tightly-coupled tasks.)

- [ ] **Step 6: Commit.**
```bash
git add src/state/store.ts src/components/TopBar.tsx src/components/TopBar.test.tsx
git commit -m "feat(ui): Portfolio/Activity view toggle in the top bar"
```

---

## Task 7: ActivityTable + FlowsSummary

**Files:** Create `src/components/ActivityTable.tsx`, `src/components/FlowsSummary.tsx`, `src/components/ActivityTable.test.tsx`.

- [ ] **Step 1: Write the failing test `src/components/ActivityTable.test.tsx`:**
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTable } from './ActivityTable';
import { FlowsSummary } from './FlowsSummary';
import type { ActivityRow, FlowRow } from '../data/types';

const rows: ActivityRow[] = [
  { chainId: 'ethereum', txHash: '0x1', timestamp: 1717200000, direction: 'in', symbol: 'USDC', contract: '0xu', decimals: 6, rawAmount: '3120000', counterparty: '0xabc', usdAtTime: 3120 },
  { chainId: 'ethereum', txHash: '0x2', timestamp: 1717100000, direction: 'out', symbol: 'ETH', contract: null, decimals: 18, rawAmount: '1000000000000000000', counterparty: '0xdef', usdAtTime: 3000 },
];

describe('ActivityTable', () => {
  it('renders a row per transfer with token and USD-at-time', () => {
    render(<ActivityTable rows={rows} />);
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('$3,120')).toBeInTheDocument();
  });
});

describe('FlowsSummary', () => {
  it('shows invested, current and gain with the flow-based disclaimer', () => {
    const perToken: FlowRow[] = [{ symbol: 'ETH', investedUsd: 600, currentUsd: 900, gainUsd: 300 }];
    render(<FlowsSummary perToken={perToken} totalInvested={600} totalCurrent={900} totalGain={300} />);
    expect(screen.getByText(/invested/i)).toBeInTheDocument();
    expect(screen.getByText(/flow-based/i)).toBeInTheDocument();
    expect(screen.getByText('$900')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/components/ActivityTable.test.tsx`

- [ ] **Step 3: Create `src/components/ActivityTable.tsx`:**
```tsx
import { getChain } from '../config/chains';
import { toAmount } from '../data/types';
import type { ActivityRow } from '../data/types';

const usd = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const when = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return <div className="text-muted text-[12px] text-center py-10">No recent activity for these wallets.</div>;
  }
  return (
    <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-muted text-[10px] uppercase tracking-widest">
            <th className="text-left p-2.5 border-b border-border">When</th>
            <th className="text-left p-2.5 border-b border-border">Flow</th>
            <th className="text-left p-2.5 border-b border-border">Asset</th>
            <th className="text-right p-2.5 border-b border-border">Amount</th>
            <th className="text-right p-2.5 border-b border-border">USD @ time</th>
            <th className="text-left p-2.5 border-b border-border">Chain</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.txHash}:${r.contract ?? 'native'}:${r.direction}`}>
              <td className="p-2.5 border-b border-[#0f171e] text-muted">{when(r.timestamp)}</td>
              <td className={`p-2.5 border-b border-[#0f171e] ${r.direction === 'in' ? 'text-neon' : 'text-danger'}`}>
                {r.direction === 'in' ? '▼ in' : '▲ out'}
              </td>
              <td className="p-2.5 border-b border-[#0f171e] font-bold text-[#e6eef3]">{r.symbol}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">
                {toAmount(r.rawAmount, r.decimals).toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{usd(r.usdAtTime)}</td>
              <td className="p-2.5 border-b border-[#0f171e]">
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-[#8ba0ad]">{getChain(r.chainId).name}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/FlowsSummary.tsx`:**
```tsx
import { Panel, Label } from './primitives';
import type { FlowRow } from '../data/types';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  perToken: FlowRow[];
  totalInvested: number;
  totalCurrent: number;
  totalGain: number;
}

export function FlowsSummary({ perToken, totalInvested, totalCurrent, totalGain }: Props) {
  const up = totalGain >= 0;
  return (
    <Panel className="mb-3">
      <Label>Invested vs now · flow-based</Label>
      <div className="flex gap-8 items-baseline mt-2 flex-wrap">
        <div>
          <div className="text-[10px] text-muted uppercase">Net invested</div>
          <div className="text-[22px] font-extrabold text-[#eafff6]">{usd(totalInvested)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">Current value</div>
          <div className="text-[22px] font-extrabold text-[#eafff6]">{usd(totalCurrent)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">Approx. gain</div>
          <div className={`text-[22px] font-extrabold ${up ? 'text-neon' : 'text-danger'}`}>
            {up ? '+' : '−'}{usd(Math.abs(totalGain))}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-[#3f5563] mt-2">
        Flow-based estimate (USD in − USD out at historical prices vs current value). Not tax cost-basis; excludes transfers between your own wallets.
      </div>
      {perToken.length > 0 && (
        <div className="mt-3 text-[12px]">
          {perToken.slice(0, 6).map((r) => (
            <div key={r.symbol} className="flex justify-between py-[3px] border-b border-[#0f171e] last:border-0">
              <span className="font-bold text-[#e6eef3]">{r.symbol}</span>
              <span className="text-muted">inv {usd(r.investedUsd)} · now {usd(r.currentUsd)} ·
                <span className={r.gainUsd >= 0 ? 'text-neon' : 'text-danger'}> {r.gainUsd >= 0 ? '+' : '−'}{usd(Math.abs(r.gainUsd))}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
```

- [ ] **Step 5: Run → PASS.** `npx vitest run src/components/ActivityTable.test.tsx`

- [ ] **Step 6: Commit.**
```bash
git add src/components/ActivityTable.tsx src/components/FlowsSummary.tsx src/components/ActivityTable.test.tsx
git commit -m "feat(ui): ActivityTable and flow-based FlowsSummary"
```

---

## Task 8: ActivityView + App wiring

**Files:** Create `src/components/ActivityView.tsx`; Modify `src/App.tsx`.

- [ ] **Step 1: Create `src/components/ActivityView.tsx`:**
```tsx
import { useMemo } from 'react';
import { useActivity } from '../state/useActivity';
import { computeFlows } from '../data/activity';
import { ActivityTable } from './ActivityTable';
import { FlowsSummary } from './FlowsSummary';
import { LoadingSkeleton } from './primitives';
import type { ChainId, AllocationSlice } from '../data/types';
import type { Wallet } from '../data/walletStore';

interface Props {
  wallets: Wallet[];
  enabledChains: ChainId[];
  byToken: AllocationSlice[]; // current value per token symbol, from the portfolio snapshot
}

export function ActivityView({ wallets, enabledChains, byToken }: Props) {
  const { data, isLoading } = useActivity(wallets, enabledChains, true);

  const flows = useMemo(() => {
    const owned = new Set(wallets.map((w) => w.address.toLowerCase()));
    const currentBySymbol = new Map(byToken.map((s) => [s.label, s.valueUsd]));
    return computeFlows(data ?? [], owned, currentBySymbol);
  }, [data, wallets, byToken]);

  if (isLoading || !data) return <LoadingSkeleton />;

  return (
    <>
      <FlowsSummary
        perToken={flows.perToken}
        totalInvested={flows.totalInvested}
        totalCurrent={flows.totalCurrent}
        totalGain={flows.totalGain}
      />
      <ActivityTable rows={data} />
    </>
  );
}
```

- [ ] **Step 2: Modify `src/App.tsx`** — pull `view`/`setView` from the store, pass them to `TopBar`, and render `ActivityView` when `view === 'activity'`. Concretely:

Change the store destructure (line 16) to include `view` and `setView`:
```tsx
  const { wallets, enabledChains, period, byokKey, view, addWallet, removeWallet, toggleChain, setPeriod, setApiKey, setView } = useAppStore();
```
Add the import near the other component imports:
```tsx
import { ActivityView } from './components/ActivityView';
```
Change the `TopBar` usage to pass the view props:
```tsx
      <TopBar wallets={wallets} onAdd={addWallet} onRemove={removeWallet} apiKey={byokKey} onApiKey={setApiKey} view={view} onView={setView} />
```
Then wrap the portfolio body so it only shows in portfolio view, and render ActivityView otherwise. Replace the block from `{isLoading && <LoadingSkeleton />}` through the closing of the `{data && !isLoading && !isError && ( ... )}` with:
```tsx
      {view === 'activity' ? (
        <ActivityView wallets={wallets} enabledChains={enabledChains} byToken={data?.byToken ?? []} />
      ) : (
        <>
          {isLoading && <LoadingSkeleton />}
          {isError && !isLoading && (
            <ErrorBanner message="Couldn't load your portfolio right now — it'll retry automatically." />
          )}
          {data && !isLoading && !isError && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3 mb-3">
                <HeroPanel
                  total={data.totalValueUsd}
                  change24h={data.change24hPct}
                  walletCount={wallets.length}
                  period={period}
                  onPeriod={setPeriod}
                  series={chartSeries}
                />
                <AllocationPanel byToken={data.byToken} byChain={data.byChain} />
              </div>
              <HoldingsTable holdings={data.holdings} />
            </>
          )}
        </>
      )}
```
Keep the `ChainFilter`, `EmptyState` early-return, and `PrivacyNote` as they are.

- [ ] **Step 3: Run the full unit suite and build.**
Run: `npm test && npm run build`
Expected: all unit tests PASS, build succeeds (this also restores the Task-6 TopBar prop coupling to green).

- [ ] **Step 4: Commit.**
```bash
git add src/components/ActivityView.tsx src/App.tsx
git commit -m "feat(ui): Activity view wired into App with flows + table"
```

---

## Task 9: e2e — Activity view renders a transfer

**Files:** Create `tests/e2e/activity.spec.ts`.

- [ ] **Step 1: Create `tests/e2e/activity.spec.ts`:**
```ts
import { test, expect } from '@playwright/test';

test('add an EVM address, open Activity, see a transfer with USD@time', async ({ page }) => {
  // Portfolio balance mocks (so the app leaves the empty state).
  await page.route('**/api/v2/addresses/*/token-balances', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v2/addresses/*/token-transfers', (route) =>
    route.fulfill({ json: { items: [
      { from: { hash: '0xsender' }, to: { hash: '0x' + 'a'.repeat(40) }, token: { address: '0xUSDC', symbol: 'USDC', decimals: '6' }, total: { value: '3120000' }, tx_hash: '0xt1', timestamp: '2026-06-01T00:00:00Z' },
    ] } }),
  );
  await page.route('**/api/v2/addresses/*/transactions', (route) => route.fulfill({ json: { items: [] } }));
  // native address info (non token-transfers, non transactions) -> coin_balance
  await page.route('**/api/v2/addresses/*', (route) => route.fulfill({ json: { coin_balance: '0' } }));
  await page.route('**/coins.llama.fi/prices/current/**', (route) => route.fulfill({ json: { coins: {} } }));
  await page.route('**/coins.llama.fi/prices/historical/**', (route) =>
    route.fulfill({ json: { coins: { 'ethereum:0xusdc': { price: 1 } } } }),
  );

  await page.goto('/');
  await page.getByPlaceholder(/wallet address/i).fill('0x' + 'a'.repeat(40));
  await page.getByRole('button', { name: /add/i }).click();

  await page.getByRole('button', { name: /activity/i }).click();
  await expect(page.getByText('USDC').first()).toBeVisible();
  await expect(page.getByText('$3,120').first()).toBeVisible();
});
```

Note: Playwright evaluates most-recently-added routes first. The specific `*/token-transfers`, `*/transactions`, and `*/token-balances` routes are added before the general `*/addresses/*` catch-all, so ensure the catch-all is registered in a position where the specific ones win — if the general route shadows them, move the general `**/api/v2/addresses/*` registration to be FIRST (before the specific ones). Verify by running; do not weaken assertions.

- [ ] **Step 2: Run the e2e suite.** `npm run e2e` — all three specs (dashboard, solana, activity) pass.

- [ ] **Step 3: Full suite + build once more.** `npm test && npm run build` — green.

- [ ] **Step 4: Commit.**
```bash
git add tests/e2e/activity.spec.ts
git commit -m "test(e2e): Activity view renders a transfer with historical USD (mocked)"
```

---

## Notes on scope

Phase 3 is EVM-only Activity + a flow-based invested-vs-current summary. Solana/Bitcoin history,
full FIFO/average tax cost-basis, swap/DeFi classification, and CEX are out of scope and must not
be added here. The summary is explicitly an approximation, labelled in the UI.
