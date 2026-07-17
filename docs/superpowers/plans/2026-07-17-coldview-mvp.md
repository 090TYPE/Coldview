# Coldview MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, client-only EVM crypto portfolio dashboard: paste wallet addresses, see aggregated holdings, allocation, 24h change, and a self-accumulated value-over-time chart — all in the browser, nothing on a server.

**Architecture:** Static React SPA. A framework-agnostic data layer (chain registry, balance/price providers, a pure `aggregatePortfolio` function, IndexedDB snapshot store, localStorage wallet store) feeds a thin Zustand + TanStack Query state layer, which feeds presentational components. Default data comes from keyless CORS APIs (Blockscout for balances, DefiLlama for prices); an optional user-supplied Alchemy key enables a richer balance provider.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, Recharts, idb-keyval. Testing: Vitest, React Testing Library, fake-indexeddb, Playwright.

---

## File Structure

```
src/
  config/chains.ts                 # chain registry (single source of truth)
  data/
    types.ts                       # shared types + keyOf/toAmount helpers
    aggregate.ts                   # aggregatePortfolio (pure)
    parseBlockscout.ts             # Blockscout JSON -> TokenBalance[]
    parseDefiLlama.ts              # DefiLlama JSON -> price map
    balanceProvider.ts             # fetch wrapper: Blockscout + Alchemy
    priceProvider.ts               # fetch wrapper: DefiLlama
    snapshot.ts                    # shouldAppend (pure) + snapshotStore (idb)
    walletStore.ts                 # localStorage wallets + BYOK key
  state/
    store.ts                       # Zustand: wallets, chains, period, byokKey
    usePortfolio.ts                # TanStack Query hooks
  components/
    primitives.tsx                 # Panel, Label, PrivacyNote, LoadingSkeleton
    EmptyState.tsx
    ErrorBanner.tsx
    HoldingsTable.tsx
    AllocationRing.tsx
    ByChainBar.tsx
    AllocationPanel.tsx
    TotalBalance.tsx
    PeriodToggle.tsx
    ValueChart.tsx
    HeroPanel.tsx
    WalletManager.tsx
    ApiKeyControl.tsx
    ChainFilter.tsx
    TopBar.tsx
  App.tsx
  main.tsx
  index.css
tests/
  fixtures/blockscout-arbitrum.json
  fixtures/defillama-prices.json
  e2e/dashboard.spec.ts
```

---

## Phase A — Project setup

### Task 1: Scaffold project and install dependencies

**Files:**
- Create: whole Vite project in repo root (`package.json`, `vite.config.ts`, `tsconfig*.json`, `src/`, `index.html`)

- [ ] **Step 1: Scaffold Vite React-TS into the current repo**

Run from the repo root (`Coldview/`):
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about the non-empty directory, choose "Ignore files and continue".

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install zustand @tanstack/react-query recharts idb-keyval
npm install -D tailwindcss@3 postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb @playwright/test
```

- [ ] **Step 3: Init Tailwind**

```bash
npx tailwindcss init -p
```
Expected: creates `tailwind.config.js` and `postcss.config.js`.

- [ ] **Step 4: Verify the app builds**

Run: `npm run build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS project with core deps"
```

---

### Task 2: Configure Vitest and Tailwind (Terminal Pro theme)

**Files:**
- Modify: `vite.config.ts`
- Create: `src/setupTests.ts`
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Configure Vitest in `vite.config.ts`**

Replace the file with:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
});
```

- [ ] **Step 2: Create `src/setupTests.ts`**

```ts
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
```

- [ ] **Step 3: Configure the Terminal Pro theme in `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070a0e',
        grid: '#0d141b',
        panel: '#0b1218',
        border: '#16212b',
        muted: '#566b7a',
        text: '#c9d4dc',
        neon: '#22e6a4',
        blue: '#3aa0ff',
        amber: '#ffb020',
        violet: '#8a5cff',
        danger: '#ff5c72',
      },
      fontFamily: {
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Replace `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background-color: #070a0e;
  color: #c9d4dc;
  font-family: 'Fira Code', ui-monospace, monospace;
  background-image:
    linear-gradient(#0d141b 1px, transparent 1px),
    linear-gradient(90deg, #0d141b 1px, transparent 1px);
  background-size: 28px 28px;
}
```

- [ ] **Step 5: Add test scripts to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test"
```

- [ ] **Step 6: Add a smoke test `src/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run the smoke test**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: configure Vitest, jsdom, fake-indexeddb and Terminal Pro Tailwind theme"
```

---

## Phase B — Data layer (TDD)

### Task 3: Shared types and helpers

**Files:**
- Create: `src/data/types.ts`
- Test: `src/data/types.test.ts`

- [ ] **Step 1: Write the failing test `src/data/types.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { keyOf, toAmount } from './types';

describe('keyOf', () => {
  it('builds a key for an ERC-20 token', () => {
    expect(keyOf('arbitrum', '0xABc')).toBe('arbitrum:0xabc');
  });
  it('uses "native" for the native coin', () => {
    expect(keyOf('ethereum', null)).toBe('ethereum:native');
  });
});

describe('toAmount', () => {
  it('converts a raw integer string by decimals', () => {
    expect(toAmount('1500000', 6)).toBeCloseTo(1.5, 9);
  });
  it('handles 18 decimals', () => {
    expect(toAmount('2271000000000000000', 18)).toBeCloseTo(2.271, 9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/types.test.ts`
Expected: FAIL (cannot find module './types').

- [ ] **Step 3: Create `src/data/types.ts`**

```ts
export type ChainId = 'ethereum' | 'arbitrum' | 'base' | 'polygon' | 'optimism';

export interface ChainInfo {
  id: ChainId;
  name: string;
  nativeSymbol: string;
  blockscoutBaseUrl: string;
  color: string;
}

export interface TokenBalance {
  chainId: ChainId;
  contract: string | null; // null = native coin
  symbol: string;
  decimals: number;
  rawBalance: string; // integer string
}

export type TokenKey = string; // `${chainId}:${contract-lowercased | 'native'}`

export interface Price {
  usd: number;
  change24hPct: number;
}

export interface Holding {
  key: TokenKey;
  chainId: ChainId;
  symbol: string;
  amount: number;
  priceUsd: number | null;
  valueUsd: number | null;
  change24hPct: number | null;
}

export interface AllocationSlice {
  label: string;
  valueUsd: number;
  pct: number;
}

export interface PortfolioSnapshot {
  holdings: Holding[];
  totalValueUsd: number;
  change24hPct: number;
  byToken: AllocationSlice[];
  byChain: AllocationSlice[];
}

export function keyOf(chainId: ChainId, contract: string | null): TokenKey {
  return `${chainId}:${contract ? contract.toLowerCase() : 'native'}`;
}

export function toAmount(rawBalance: string, decimals: number): number {
  return Number(rawBalance) / 10 ** decimals;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/types.test.ts`
Expected: PASS (4 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/types.test.ts
git commit -m "feat(data): shared portfolio types and keyOf/toAmount helpers"
```

---

### Task 4: Chain registry

**Files:**
- Create: `src/config/chains.ts`
- Test: `src/config/chains.test.ts`

- [ ] **Step 1: Write the failing test `src/config/chains.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { CHAINS, getChain } from './chains';

describe('chain registry', () => {
  it('includes the five Phase 1 chains', () => {
    expect(CHAINS.map((c) => c.id)).toEqual([
      'ethereum', 'arbitrum', 'base', 'polygon', 'optimism',
    ]);
  });
  it('every chain has a Blockscout base URL and native symbol', () => {
    for (const c of CHAINS) {
      expect(c.blockscoutBaseUrl).toMatch(/^https:\/\//);
      expect(c.nativeSymbol.length).toBeGreaterThan(0);
    }
  });
  it('getChain returns a chain by id', () => {
    expect(getChain('base').name).toBe('Base');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/chains.test.ts`
Expected: FAIL (cannot find module './chains').

- [ ] **Step 3: Create `src/config/chains.ts`**

```ts
import type { ChainId, ChainInfo } from '../data/types';

export const CHAINS: ChainInfo[] = [
  { id: 'ethereum', name: 'Ethereum', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://eth.blockscout.com', color: '#3aa0ff' },
  { id: 'arbitrum', name: 'Arbitrum', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://arbitrum.blockscout.com', color: '#22e6a4' },
  { id: 'base', name: 'Base', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://base.blockscout.com', color: '#5eead4' },
  { id: 'polygon', name: 'Polygon', nativeSymbol: 'POL', blockscoutBaseUrl: 'https://polygon.blockscout.com', color: '#8a5cff' },
  { id: 'optimism', name: 'Optimism', nativeSymbol: 'ETH', blockscoutBaseUrl: 'https://optimism.blockscout.com', color: '#ffb020' },
];

export function getChain(id: ChainId): ChainInfo {
  const c = CHAINS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chain: ${id}`);
  return c;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/chains.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/chains.ts src/config/chains.test.ts
git commit -m "feat(config): EVM chain registry for Phase 1"
```

---

### Task 5: aggregatePortfolio — the pure core

**Files:**
- Create: `src/data/aggregate.ts`
- Test: `src/data/aggregate.test.ts`

- [ ] **Step 1: Write the failing test `src/data/aggregate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { aggregatePortfolio } from './aggregate';
import { keyOf } from './types';
import type { TokenBalance, Price, TokenKey } from './types';

const bal = (p: Partial<TokenBalance>): TokenBalance => ({
  chainId: 'arbitrum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '0', ...p,
});

const prices = (m: Record<string, Price>): Record<TokenKey, Price> => m;

describe('aggregatePortfolio', () => {
  it('computes value = amount * price and a total', () => {
    const balances = [bal({ chainId: 'arbitrum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' })];
    const snap = aggregatePortfolio(balances, prices({ [keyOf('arbitrum', null)]: { usd: 2000, change24hPct: 0 } }));
    expect(snap.totalValueUsd).toBeCloseTo(2000, 6);
    expect(snap.holdings[0].valueUsd).toBeCloseTo(2000, 6);
  });

  it('dedupes the same token across wallets by summing balances', () => {
    const c = '0xusdc';
    const balances = [
      bal({ chainId: 'arbitrum', contract: c, symbol: 'USDC', decimals: 6, rawBalance: '1000000' }),
      bal({ chainId: 'arbitrum', contract: c, symbol: 'USDC', decimals: 6, rawBalance: '2000000' }),
    ];
    const snap = aggregatePortfolio(balances, prices({ [keyOf('arbitrum', c)]: { usd: 1, change24hPct: 0 } }));
    expect(snap.holdings).toHaveLength(1);
    expect(snap.holdings[0].amount).toBeCloseTo(3, 6);
    expect(snap.totalValueUsd).toBeCloseTo(3, 6);
  });

  it('computes value-weighted 24h change', () => {
    const balances = [
      bal({ chainId: 'ethereum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' }),
      bal({ chainId: 'arbitrum', contract: '0xu', symbol: 'USDC', decimals: 6, rawBalance: '1000000' }),
    ];
    const snap = aggregatePortfolio(balances, prices({
      [keyOf('ethereum', null)]: { usd: 3000, change24hPct: 10 },
      [keyOf('arbitrum', '0xu')]: { usd: 1, change24hPct: 0 },
    }));
    // (3000*10 + 1*0) / 3001
    expect(snap.change24hPct).toBeCloseTo(9.9967, 3);
  });

  it('builds byToken and byChain allocation percentages', () => {
    const balances = [
      bal({ chainId: 'ethereum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' }),
      bal({ chainId: 'arbitrum', contract: '0xu', symbol: 'USDC', decimals: 6, rawBalance: '1000000' }),
    ];
    const snap = aggregatePortfolio(balances, prices({
      [keyOf('ethereum', null)]: { usd: 3000, change24hPct: 0 },
      [keyOf('arbitrum', '0xu')]: { usd: 1000, change24hPct: 0 },
    }));
    const eth = snap.byToken.find((s) => s.label === 'ETH')!;
    expect(eth.pct).toBeCloseTo(75, 6);
    const arb = snap.byChain.find((s) => s.label === 'Arbitrum')!;
    expect(arb.pct).toBeCloseTo(25, 6);
  });

  it('drops dust and priceless tokens below the value threshold', () => {
    const balances = [
      bal({ chainId: 'base', contract: '0xspam', symbol: 'SPAM', decimals: 18, rawBalance: '1000000000000000000' }),
      bal({ chainId: 'base', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1000000000000000000' }),
    ];
    const snap = aggregatePortfolio(
      balances,
      prices({ [keyOf('base', null)]: { usd: 2000, change24hPct: 0 } }), // SPAM has no price
      { minValueUsd: 0.01 },
    );
    expect(snap.holdings.map((h) => h.symbol)).toEqual(['ETH']);
    expect(snap.totalValueUsd).toBeCloseTo(2000, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/aggregate.test.ts`
Expected: FAIL (cannot find module './aggregate').

- [ ] **Step 3: Create `src/data/aggregate.ts`**

```ts
import { keyOf, toAmount } from './types';
import { getChain } from '../config/chains';
import type {
  TokenBalance, TokenKey, Price, Holding, PortfolioSnapshot, AllocationSlice,
} from './types';

interface Options {
  minValueUsd?: number;
}

export function aggregatePortfolio(
  balances: TokenBalance[],
  prices: Record<TokenKey, Price>,
  opts: Options = {},
): PortfolioSnapshot {
  const minValueUsd = opts.minValueUsd ?? 0;

  // 1. Dedupe by (chainId, contract): sum raw balances.
  const merged = new Map<TokenKey, TokenBalance>();
  for (const b of balances) {
    const k = keyOf(b.chainId, b.contract);
    const existing = merged.get(k);
    if (existing) {
      existing.rawBalance = (BigInt(existing.rawBalance) + BigInt(b.rawBalance)).toString();
    } else {
      merged.set(k, { ...b });
    }
  }

  // 2. Price each holding.
  const holdings: Holding[] = [];
  for (const [k, b] of merged) {
    const amount = toAmount(b.rawBalance, b.decimals);
    const price = prices[k];
    const priceUsd = price ? price.usd : null;
    const valueUsd = priceUsd !== null ? amount * priceUsd : null;
    const change24hPct = price ? price.change24hPct : null;
    holdings.push({ key: k, chainId: b.chainId, symbol: b.symbol, amount, priceUsd, valueUsd, change24hPct });
  }

  // 3. Filter dust / priceless below threshold, then sort by value desc.
  const kept = holdings
    .filter((h) => h.valueUsd !== null && h.valueUsd >= minValueUsd)
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

  const totalValueUsd = kept.reduce((s, h) => s + (h.valueUsd ?? 0), 0);

  // 4. Value-weighted 24h change.
  const change24hPct = totalValueUsd > 0
    ? kept.reduce((s, h) => s + (h.valueUsd ?? 0) * (h.change24hPct ?? 0), 0) / totalValueUsd
    : 0;

  // 5. Allocation by token symbol and by chain.
  const byToken = groupSlices(kept, (h) => h.symbol, totalValueUsd);
  const byChain = groupSlices(kept, (h) => getChain(h.chainId).name, totalValueUsd);

  return { holdings: kept, totalValueUsd, change24hPct, byToken, byChain };
}

function groupSlices(
  holdings: Holding[],
  labelOf: (h: Holding) => string,
  total: number,
): AllocationSlice[] {
  const sums = new Map<string, number>();
  for (const h of holdings) {
    sums.set(labelOf(h), (sums.get(labelOf(h)) ?? 0) + (h.valueUsd ?? 0));
  }
  return [...sums.entries()]
    .map(([label, valueUsd]) => ({ label, valueUsd, pct: total > 0 ? (valueUsd / total) * 100 : 0 }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/aggregate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/aggregate.ts src/data/aggregate.test.ts
git commit -m "feat(data): pure aggregatePortfolio (dedupe, pricing, allocation, weighted 24h, dust filter)"
```

---

### Task 6: Blockscout balance parser

**Files:**
- Create: `tests/fixtures/blockscout-arbitrum.json`
- Create: `src/data/parseBlockscout.ts`
- Test: `src/data/parseBlockscout.test.ts`

- [ ] **Step 1: Create fixture `tests/fixtures/blockscout-arbitrum.json`**

This mirrors the shape of `GET /api/v2/addresses/{addr}/token-balances`:
```json
[
  {
    "token": { "address": "0xUSDC", "symbol": "USDC", "decimals": "6", "type": "ERC-20" },
    "value": "3120000000"
  },
  {
    "token": { "address": "0xARB", "symbol": "ARB", "decimals": "18", "type": "ERC-20" },
    "value": "1780000000000000000000"
  },
  {
    "token": { "address": "0xSPAM", "symbol": "SPAM", "decimals": "18", "type": "ERC-20" },
    "value": "0"
  }
]
```

- [ ] **Step 2: Write the failing test `src/data/parseBlockscout.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/blockscout-arbitrum.json';
import { parseBlockscoutBalances, nativeBalance } from './parseBlockscout';

describe('parseBlockscoutBalances', () => {
  it('normalizes ERC-20 token balances and skips zero balances', () => {
    const out = parseBlockscoutBalances(fixture, 'arbitrum');
    expect(out.map((t) => t.symbol)).toEqual(['USDC', 'ARB']);
    const usdc = out[0];
    expect(usdc).toMatchObject({ chainId: 'arbitrum', contract: '0xusdc', decimals: 6, rawBalance: '3120000000' });
  });
});

describe('nativeBalance', () => {
  it('builds a native TokenBalance from a coin-balance value', () => {
    const t = nativeBalance('1500000000000000000', 'ethereum', 'ETH');
    expect(t).toEqual({ chainId: 'ethereum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '1500000000000000000' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/parseBlockscout.test.ts`
Expected: FAIL (cannot find module './parseBlockscout').

- [ ] **Step 4: Create `src/data/parseBlockscout.ts`**

```ts
import type { ChainId, TokenBalance } from './types';

interface BlockscoutTokenBalance {
  token: { address: string; symbol: string | null; decimals: string | null; type: string };
  value: string;
}

export function parseBlockscoutBalances(raw: unknown, chainId: ChainId): TokenBalance[] {
  if (!Array.isArray(raw)) return [];
  const out: TokenBalance[] = [];
  for (const item of raw as BlockscoutTokenBalance[]) {
    if (!item?.token || item.value === '0' || item.value == null) continue;
    if (item.token.type && !item.token.type.startsWith('ERC-20')) continue;
    const decimals = Number(item.token.decimals ?? '18');
    if (!Number.isFinite(decimals)) continue;
    out.push({
      chainId,
      contract: item.token.address.toLowerCase(),
      symbol: item.token.symbol ?? '???',
      decimals,
      rawBalance: item.value,
    });
  }
  return out;
}

export function nativeBalance(value: string, chainId: ChainId, symbol: string): TokenBalance {
  return { chainId, contract: null, symbol, decimals: 18, rawBalance: value };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/parseBlockscout.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/parseBlockscout.ts src/data/parseBlockscout.test.ts tests/fixtures/blockscout-arbitrum.json
git commit -m "feat(data): Blockscout balance parser + fixture"
```

---

### Task 7: DefiLlama price parser

**Files:**
- Create: `tests/fixtures/defillama-prices.json`
- Create: `src/data/parseDefiLlama.ts`
- Test: `src/data/parseDefiLlama.test.ts`

- [ ] **Step 1: Create fixture `tests/fixtures/defillama-prices.json`**

Mirrors `GET https://coins.llama.fi/prices/current/{keys}` where keys are `chain:address`:
```json
{
  "coins": {
    "arbitrum:0xusdc": { "price": 1.0, "confidence": 0.99 },
    "arbitrum:0xarb": { "price": 1.26, "confidence": 0.98 },
    "coingecko:ethereum": { "price": 2473.0, "confidence": 0.99 }
  }
}
```

- [ ] **Step 2: Write the failing test `src/data/parseDefiLlama.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/defillama-prices.json';
import { defiLlamaKeys, parseDefiLlamaPrices } from './parseDefiLlama';
import { keyOf } from './types';
import type { TokenBalance } from './types';

const bal = (p: Partial<TokenBalance>): TokenBalance => ({
  chainId: 'arbitrum', contract: null, symbol: 'ETH', decimals: 18, rawBalance: '0', ...p,
});

describe('defiLlamaKeys', () => {
  it('maps native coins to coingecko ids and ERC-20 to chain:address', () => {
    const req = defiLlamaKeys([
      bal({ chainId: 'arbitrum', contract: null, symbol: 'ETH' }),
      bal({ chainId: 'arbitrum', contract: '0xARB', symbol: 'ARB' }),
    ]);
    // native ETH -> coingecko:ethereum ; ARB -> arbitrum:0xarb
    expect(req.llamaKeys).toContain('coingecko:ethereum');
    expect(req.llamaKeys).toContain('arbitrum:0xarb');
    // and remembers which TokenKey each llama key maps back to
    expect(req.byLlamaKey['arbitrum:0xarb']).toBe(keyOf('arbitrum', '0xARB'));
  });
});

describe('parseDefiLlamaPrices', () => {
  it('produces a price map keyed by our TokenKey', () => {
    const req = defiLlamaKeys([bal({ chainId: 'arbitrum', contract: '0xusdc', symbol: 'USDC', decimals: 6 })]);
    const prices = parseDefiLlamaPrices(fixture, req.byLlamaKey);
    expect(prices[keyOf('arbitrum', '0xusdc')].usd).toBe(1.0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/parseDefiLlama.test.ts`
Expected: FAIL (cannot find module './parseDefiLlama').

- [ ] **Step 4: Create `src/data/parseDefiLlama.ts`**

```ts
import { keyOf } from './types';
import type { TokenBalance, TokenKey, Price } from './types';

// Native coin -> CoinGecko id used by DefiLlama's `coingecko:` namespace.
const NATIVE_COINGECKO: Record<string, string> = {
  ETH: 'ethereum',
  POL: 'matic-network',
};

export interface LlamaRequest {
  llamaKeys: string[];
  byLlamaKey: Record<string, TokenKey>;
}

export function defiLlamaKeys(balances: TokenBalance[]): LlamaRequest {
  const byLlamaKey: Record<string, TokenKey> = {};
  const set = new Set<string>();
  for (const b of balances) {
    const ourKey = keyOf(b.chainId, b.contract);
    let llamaKey: string;
    if (b.contract === null) {
      const cg = NATIVE_COINGECKO[b.symbol] ?? '';
      if (!cg) continue;
      llamaKey = `coingecko:${cg}`;
    } else {
      llamaKey = `${b.chainId}:${b.contract.toLowerCase()}`;
    }
    set.add(llamaKey);
    byLlamaKey[llamaKey] = ourKey;
  }
  return { llamaKeys: [...set], byLlamaKey };
}

interface LlamaResponse {
  coins: Record<string, { price: number; confidence?: number }>;
}

export function parseDefiLlamaPrices(
  raw: unknown,
  byLlamaKey: Record<string, TokenKey>,
): Record<TokenKey, Price> {
  const res = raw as LlamaResponse;
  const out: Record<TokenKey, Price> = {};
  if (!res?.coins) return out;
  for (const [llamaKey, data] of Object.entries(res.coins)) {
    const ourKey = byLlamaKey[llamaKey];
    if (!ourKey || typeof data.price !== 'number') continue;
    // DefiLlama current-prices endpoint has no 24h change; default 0 (Task 8 can enrich).
    out[ourKey] = { usd: data.price, change24hPct: 0 };
  }
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/parseDefiLlama.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/parseDefiLlama.ts src/data/parseDefiLlama.test.ts tests/fixtures/defillama-prices.json
git commit -m "feat(data): DefiLlama price key mapping and parser + fixture"
```

---

### Task 8: Balance & price fetch wrappers

**Files:**
- Create: `src/data/balanceProvider.ts`
- Create: `src/data/priceProvider.ts`
- Test: `src/data/providers.test.ts`

- [ ] **Step 1: Write the failing test `src/data/providers.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchBalances } from './balanceProvider';
import { fetchPrices } from './priceProvider';
import { keyOf } from './types';
import type { TokenBalance } from './types';

afterEach(() => vi.restoreAllMocks());

describe('fetchBalances (Blockscout)', () => {
  it('fetches token + native balances for an address on a chain', async () => {
    const tokenJson = [{ token: { address: '0xArb', symbol: 'ARB', decimals: '18', type: 'ERC-20' }, value: '1000000000000000000' }];
    const coinJson = { coin_balance: '2000000000000000000' };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const body = url.includes('/token-balances') ? tokenJson : coinJson;
      return { ok: true, json: async () => body } as Response;
    }));
    const out = await fetchBalances('0xabc', 'arbitrum');
    const symbols = out.map((t: TokenBalance) => t.symbol).sort();
    expect(symbols).toEqual(['ARB', 'ETH']);
  });
});

describe('fetchPrices (DefiLlama)', () => {
  it('returns a price map for the given balances', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ coins: { 'arbitrum:0xarb': { price: 1.26 } } }),
    } as Response)));
    const prices = await fetchPrices([
      { chainId: 'arbitrum', contract: '0xARB', symbol: 'ARB', decimals: 18, rawBalance: '1' },
    ]);
    expect(prices[keyOf('arbitrum', '0xARB')].usd).toBe(1.26);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/providers.test.ts`
Expected: FAIL (cannot find module './balanceProvider').

- [ ] **Step 3: Create `src/data/balanceProvider.ts`**

```ts
import { getChain } from '../config/chains';
import { parseBlockscoutBalances, nativeBalance } from './parseBlockscout';
import type { ChainId, TokenBalance } from './types';

export async function fetchBalances(address: string, chainId: ChainId): Promise<TokenBalance[]> {
  const chain = getChain(chainId);
  const base = chain.blockscoutBaseUrl;

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
```

- [ ] **Step 4: Create `src/data/priceProvider.ts`**

```ts
import { defiLlamaKeys, parseDefiLlamaPrices } from './parseDefiLlama';
import type { Price, TokenBalance, TokenKey } from './types';

export async function fetchPrices(balances: TokenBalance[]): Promise<Record<TokenKey, Price>> {
  const req = defiLlamaKeys(balances);
  if (req.llamaKeys.length === 0) return {};
  const url = `https://coins.llama.fi/prices/current/${req.llamaKeys.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  return parseDefiLlamaPrices(await res.json(), req.byLlamaKey);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/providers.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/balanceProvider.ts src/data/priceProvider.ts src/data/providers.test.ts
git commit -m "feat(data): Blockscout balance and DefiLlama price fetch wrappers"
```

---

### Task 9: Snapshot store (throttle + IndexedDB)

**Files:**
- Create: `src/data/snapshot.ts`
- Test: `src/data/snapshot.test.ts`

- [ ] **Step 1: Write the failing test `src/data/snapshot.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { shouldAppend, appendSnapshot, getSnapshots, HOUR_MS } from './snapshot';

describe('shouldAppend', () => {
  it('appends when there is no prior point', () => {
    expect(shouldAppend(null, 1000)).toBe(true);
  });
  it('rejects within an hour of the last point', () => {
    expect(shouldAppend(1000, 1000 + HOUR_MS - 1)).toBe(false);
  });
  it('appends after an hour', () => {
    expect(shouldAppend(1000, 1000 + HOUR_MS)).toBe(true);
  });
});

describe('snapshot store (IndexedDB)', () => {
  beforeEach(async () => {
    const all = await getSnapshots();
    // fake-indexeddb resets per test file via setup; ensure empty start
    expect(Array.isArray(all)).toBe(true);
  });

  it('appends a point when enough time has passed and reads it back', async () => {
    await appendSnapshot(1234.5, 1000);
    await appendSnapshot(9999.9, 1000 + 10); // throttled away
    const series = await getSnapshots();
    expect(series).toEqual([{ t: 1000, v: 1234.5 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/snapshot.test.ts`
Expected: FAIL (cannot find module './snapshot').

- [ ] **Step 3: Create `src/data/snapshot.ts`**

```ts
import { get, set } from 'idb-keyval';

export const HOUR_MS = 60 * 60 * 1000;
const STORE_KEY = 'coldview:snapshots';

export interface SnapshotPoint {
  t: number; // epoch ms
  v: number; // total value USD
}

export function shouldAppend(lastTs: number | null, now: number): boolean {
  if (lastTs === null) return true;
  return now - lastTs >= HOUR_MS;
}

export async function getSnapshots(): Promise<SnapshotPoint[]> {
  return (await get<SnapshotPoint[]>(STORE_KEY)) ?? [];
}

export async function appendSnapshot(totalValueUsd: number, now: number = Date.now()): Promise<void> {
  const series = await getSnapshots();
  const last = series.length ? series[series.length - 1].t : null;
  if (!shouldAppend(last, now)) return;
  series.push({ t: now, v: totalValueUsd });
  await set(STORE_KEY, series);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/snapshot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/snapshot.ts src/data/snapshot.test.ts
git commit -m "feat(data): self-accumulated value snapshot store with hourly throttle"
```

---

### Task 10: Wallet store (localStorage)

**Files:**
- Create: `src/data/walletStore.ts`
- Test: `src/data/walletStore.test.ts`

- [ ] **Step 1: Write the failing test `src/data/walletStore.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWallets, saveWallets, isValidAddress, loadApiKey, saveApiKey } from './walletStore';

beforeEach(() => localStorage.clear());

describe('isValidAddress', () => {
  it('accepts a 0x + 40 hex address', () => {
    expect(isValidAddress('0x' + 'a'.repeat(40))).toBe(true);
  });
  it('rejects malformed input', () => {
    expect(isValidAddress('nope')).toBe(false);
    expect(isValidAddress('0x123')).toBe(false);
  });
});

describe('wallet persistence', () => {
  it('round-trips the wallet list', () => {
    saveWallets([{ address: '0xabc', label: 'Main' }]);
    expect(loadWallets()).toEqual([{ address: '0xabc', label: 'Main' }]);
  });
  it('returns [] when nothing is stored', () => {
    expect(loadWallets()).toEqual([]);
  });
});

describe('BYOK api key', () => {
  it('round-trips the key and defaults to empty', () => {
    expect(loadApiKey()).toBe('');
    saveApiKey('secret');
    expect(loadApiKey()).toBe('secret');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/walletStore.test.ts`
Expected: FAIL (cannot find module './walletStore').

- [ ] **Step 3: Create `src/data/walletStore.ts`**

```ts
export interface Wallet {
  address: string;
  label: string;
}

const WALLETS_KEY = 'coldview:wallets';
const APIKEY_KEY = 'coldview:apikey';

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

export function loadWallets(): Wallet[] {
  try {
    const raw = localStorage.getItem(WALLETS_KEY);
    return raw ? (JSON.parse(raw) as Wallet[]) : [];
  } catch {
    return [];
  }
}

export function saveWallets(wallets: Wallet[]): void {
  localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

export function loadApiKey(): string {
  return localStorage.getItem(APIKEY_KEY) ?? '';
}

export function saveApiKey(key: string): void {
  localStorage.setItem(APIKEY_KEY, key);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/walletStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/walletStore.ts src/data/walletStore.test.ts
git commit -m "feat(data): localStorage wallet list and BYOK key with address validation"
```

---

## Phase C — State

### Task 11: Zustand store

**Files:**
- Create: `src/state/store.ts`
- Test: `src/state/store.test.ts`

- [ ] **Step 1: Write the failing test `src/state/store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './store';

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState(useAppStore.getInitialState());
});

describe('app store', () => {
  it('adds and removes wallets and persists them', () => {
    useAppStore.getState().addWallet('0x' + 'a'.repeat(40), 'Main');
    expect(useAppStore.getState().wallets).toHaveLength(1);
    const addr = useAppStore.getState().wallets[0].address;
    useAppStore.getState().removeWallet(addr);
    expect(useAppStore.getState().wallets).toHaveLength(0);
  });

  it('ignores invalid addresses', () => {
    useAppStore.getState().addWallet('bad', 'X');
    expect(useAppStore.getState().wallets).toHaveLength(0);
  });

  it('toggles enabled chains and defaults to all chains enabled', () => {
    const s = useAppStore.getState();
    expect(s.enabledChains).toContain('ethereum');
    s.toggleChain('ethereum');
    expect(useAppStore.getState().enabledChains).not.toContain('ethereum');
  });

  it('sets period and api key', () => {
    useAppStore.getState().setPeriod('7d');
    expect(useAppStore.getState().period).toBe('7d');
    useAppStore.getState().setApiKey('k');
    expect(useAppStore.getState().byokKey).toBe('k');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/store.test.ts`
Expected: FAIL (cannot find module './store').

- [ ] **Step 3: Create `src/state/store.ts`**

```ts
import { create } from 'zustand';
import type { ChainId } from '../data/types';
import { CHAINS } from '../config/chains';
import {
  loadWallets, saveWallets, isValidAddress, loadApiKey, saveApiKey, type Wallet,
} from '../data/walletStore';

export type Period = '24h' | '7d' | '30d' | 'all';

interface AppState {
  wallets: Wallet[];
  enabledChains: ChainId[];
  period: Period;
  byokKey: string;
  addWallet: (address: string, label: string) => void;
  removeWallet: (address: string) => void;
  toggleChain: (id: ChainId) => void;
  setPeriod: (p: Period) => void;
  setApiKey: (k: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  wallets: loadWallets(),
  enabledChains: CHAINS.map((c) => c.id),
  period: '30d',
  byokKey: loadApiKey(),

  addWallet: (address, label) => {
    if (!isValidAddress(address)) return;
    const normalized = address.trim().toLowerCase();
    if (get().wallets.some((w) => w.address === normalized)) return;
    const wallets = [...get().wallets, { address: normalized, label: label.trim() || 'Wallet' }];
    saveWallets(wallets);
    set({ wallets });
  },

  removeWallet: (address) => {
    const wallets = get().wallets.filter((w) => w.address !== address);
    saveWallets(wallets);
    set({ wallets });
  },

  toggleChain: (id) => {
    const on = get().enabledChains.includes(id);
    set({ enabledChains: on ? get().enabledChains.filter((c) => c !== id) : [...get().enabledChains, id] });
  },

  setPeriod: (period) => set({ period }),

  setApiKey: (byokKey) => {
    saveApiKey(byokKey);
    set({ byokKey });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/store.ts src/state/store.test.ts
git commit -m "feat(state): Zustand store for wallets, chains, period and BYOK key"
```

---

### Task 12: Portfolio data hook (TanStack Query)

**Files:**
- Create: `src/state/usePortfolio.ts`
- Test: `src/state/usePortfolio.test.tsx`

- [ ] **Step 1: Write the failing test `src/state/usePortfolio.test.tsx`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePortfolio } from './usePortfolio';
import type { Wallet } from '../data/walletStore';

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('usePortfolio', () => {
  it('aggregates balances and prices into a snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/token-balances')) {
        return { ok: true, json: async () => ([{ token: { address: '0xARB', symbol: 'ARB', decimals: '18', type: 'ERC-20' }, value: '1000000000000000000' }]) } as Response;
      }
      if (url.includes('coins.llama.fi')) {
        return { ok: true, json: async () => ({ coins: { 'arbitrum:0xarb': { price: 2 } } }) } as Response;
      }
      return { ok: true, json: async () => ({ coin_balance: '0' }) } as Response;
    }));

    const wallets: Wallet[] = [{ address: '0x' + 'a'.repeat(40), label: 'Main' }];
    const { result } = renderHook(() => usePortfolio(wallets, ['arbitrum']), { wrapper });

    await waitFor(() => expect(result.current.data?.totalValueUsd).toBeCloseTo(2, 6));
    expect(result.current.data?.holdings[0].symbol).toBe('ARB');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/usePortfolio.test.tsx`
Expected: FAIL (cannot find module './usePortfolio').

- [ ] **Step 3: Create `src/state/usePortfolio.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchBalances } from '../data/balanceProvider';
import { fetchPrices } from '../data/priceProvider';
import { aggregatePortfolio } from '../data/aggregate';
import { appendSnapshot } from '../data/snapshot';
import type { ChainId, TokenBalance, PortfolioSnapshot } from '../data/types';
import type { Wallet } from '../data/walletStore';

async function loadPortfolio(wallets: Wallet[], chains: ChainId[]): Promise<PortfolioSnapshot> {
  const pairs = wallets.flatMap((w) => chains.map((c) => ({ address: w.address, chain: c })));
  const results = await Promise.allSettled(pairs.map((p) => fetchBalances(p.address, p.chain)));
  const balances: TokenBalance[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  const prices = await fetchPrices(balances);
  const snapshot = aggregatePortfolio(balances, prices, { minValueUsd: 0.01 });

  if (snapshot.totalValueUsd > 0) {
    await appendSnapshot(snapshot.totalValueUsd);
  }
  return snapshot;
}

export function usePortfolio(wallets: Wallet[], chains: ChainId[]) {
  return useQuery({
    queryKey: ['portfolio', wallets.map((w) => w.address).sort(), [...chains].sort()],
    queryFn: () => loadPortfolio(wallets, chains),
    enabled: wallets.length > 0 && chains.length > 0,
    staleTime: 60_000,
    retry: 1,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/usePortfolio.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/usePortfolio.ts src/state/usePortfolio.test.tsx
git commit -m "feat(state): usePortfolio hook aggregating balances+prices with snapshotting"
```

---

## Phase D — UI components

### Task 13: Presentational primitives

**Files:**
- Create: `src/components/primitives.tsx`
- Test: `src/components/primitives.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/primitives.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel, Label, PrivacyNote } from './primitives';

describe('primitives', () => {
  it('Panel renders children', () => {
    render(<Panel><span>hi</span></Panel>);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
  it('Label renders uppercase-styled text', () => {
    render(<Label>total</Label>);
    expect(screen.getByText('total')).toBeInTheDocument();
  });
  it('PrivacyNote states data stays local', () => {
    render(<PrivacyNote />);
    expect(screen.getByText(/never leave/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/primitives.test.tsx`
Expected: FAIL (cannot find module './primitives').

- [ ] **Step 3: Create `src/components/primitives.tsx`**

```tsx
import type { ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-panel border border-border rounded-[10px] p-4 ${className}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-muted text-[10px] tracking-[1.2px] uppercase">{children}</div>;
}

export function PrivacyNote() {
  return (
    <div className="text-[11px] text-[#3f5563] text-center mt-3">
      🔒 Your addresses and history stay in this browser and never leave your device.
    </div>
  );
}

export function LoadingSkeleton() {
  return <div className="animate-pulse h-24 bg-panel border border-border rounded-[10px]" aria-label="loading" />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/primitives.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/primitives.tsx src/components/primitives.test.tsx
git commit -m "feat(ui): Panel, Label, PrivacyNote, LoadingSkeleton primitives"
```

---

### Task 14: EmptyState

**Files:**
- Create: `src/components/EmptyState.tsx`
- Test: `src/components/EmptyState.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/EmptyState.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('validates and submits a wallet address', async () => {
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);
    const input = screen.getByPlaceholderText(/0x/i);
    await userEvent.type(input, '0x' + 'a'.repeat(40));
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith('0x' + 'a'.repeat(40));
  });

  it('shows an error for an invalid address and does not submit', async () => {
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);
    await userEvent.type(screen.getByPlaceholderText(/0x/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/valid address/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EmptyState.test.tsx`
Expected: FAIL (cannot find module './EmptyState').

- [ ] **Step 3: Create `src/components/EmptyState.tsx`**

```tsx
import { useState } from 'react';
import { isValidAddress } from '../data/walletStore';
import { PrivacyNote } from './primitives';

export function EmptyState({ onAdd }: { onAdd: (address: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!isValidAddress(value)) {
      setError('Enter a valid address (0x + 40 hex characters).');
      return;
    }
    setError('');
    onAdd(value.trim());
    setValue('');
  };

  return (
    <div className="max-w-md mx-auto text-center mt-24">
      <div className="text-2xl font-extrabold text-white mb-1">◈ Coldview</div>
      <div className="text-muted text-sm mb-6">A private, read-only crypto portfolio. Paste a wallet address to begin.</div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-text outline-none focus:border-neon"
          placeholder="0x… wallet address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="px-4 py-2 rounded-lg bg-neon/10 border border-neon text-neon" onClick={submit}>
          Add
        </button>
      </div>
      {error && <div className="text-danger text-xs mt-2">{error}</div>}
      <PrivacyNote />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/EmptyState.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/EmptyState.tsx src/components/EmptyState.test.tsx
git commit -m "feat(ui): onboarding EmptyState with address validation"
```

---

### Task 15: HoldingsTable

**Files:**
- Create: `src/components/HoldingsTable.tsx`
- Test: `src/components/HoldingsTable.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/HoldingsTable.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HoldingsTable } from './HoldingsTable';
import type { Holding } from '../data/types';

const holdings: Holding[] = [
  { key: 'ethereum:native', chainId: 'ethereum', symbol: 'ETH', amount: 2.271, priceUsd: 2473, valueUsd: 5616, change24hPct: 3.1 },
  { key: 'polygon:0x', chainId: 'polygon', symbol: 'MATIC', amount: 2400, priceUsd: 0.49, valueUsd: 1180, change24hPct: -1.4 },
];

describe('HoldingsTable', () => {
  it('renders one row per holding with symbol and value', () => {
    render(<HoldingsTable holdings={holdings} />);
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('MATIC')).toBeInTheDocument();
    expect(screen.getByText('$5,616')).toBeInTheDocument();
  });

  it('shows negative change with the danger indicator', () => {
    render(<HoldingsTable holdings={holdings} />);
    expect(screen.getByText(/1.4%/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/HoldingsTable.test.tsx`
Expected: FAIL (cannot find module './HoldingsTable').

- [ ] **Step 3: Create `src/components/HoldingsTable.tsx`**

```tsx
import { getChain } from '../config/chains';
import type { Holding } from '../data/types';

const usd = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const pct = (n: number | null) => (n === null ? '' : `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}%`);

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-muted text-[10px] uppercase tracking-widest">
            <th className="text-left p-2.5 border-b border-border">Asset</th>
            <th className="text-left p-2.5 border-b border-border">Chain</th>
            <th className="text-right p-2.5 border-b border-border">Balance</th>
            <th className="text-right p-2.5 border-b border-border">Price</th>
            <th className="text-right p-2.5 border-b border-border">Value</th>
            <th className="text-right p-2.5 border-b border-border">24h</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.key}>
              <td className="p-2.5 border-b border-[#0f171e] font-bold text-[#e6eef3]">{h.symbol}</td>
              <td className="p-2.5 border-b border-[#0f171e]">
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-[#8ba0ad]">
                  {getChain(h.chainId).name}
                </span>
              </td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{h.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{usd(h.priceUsd)}</td>
              <td className="p-2.5 border-b border-[#0f171e] text-right">{usd(h.valueUsd)}</td>
              <td className={`p-2.5 border-b border-[#0f171e] text-right ${h.change24hPct === null ? 'text-muted' : h.change24hPct >= 0 ? 'text-neon' : 'text-danger'}`}>
                {pct(h.change24hPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/HoldingsTable.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HoldingsTable.tsx src/components/HoldingsTable.test.tsx
git commit -m "feat(ui): HoldingsTable"
```

---

### Task 16: Allocation ring, by-chain bar, and panel

**Files:**
- Create: `src/components/AllocationRing.tsx`
- Create: `src/components/ByChainBar.tsx`
- Create: `src/components/AllocationPanel.tsx`
- Test: `src/components/AllocationPanel.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/AllocationPanel.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllocationPanel } from './AllocationPanel';
import type { AllocationSlice } from '../data/types';

const byToken: AllocationSlice[] = [
  { label: 'ETH', valueUsd: 7500, pct: 75 },
  { label: 'USDC', valueUsd: 2500, pct: 25 },
];
const byChain: AllocationSlice[] = [
  { label: 'Ethereum', valueUsd: 7500, pct: 75 },
  { label: 'Arbitrum', valueUsd: 2500, pct: 25 },
];

describe('AllocationPanel', () => {
  it('lists token allocation with percentages', () => {
    render(<AllocationPanel byToken={byToken} byChain={byChain} />);
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AllocationPanel.test.tsx`
Expected: FAIL (cannot find module './AllocationPanel').

- [ ] **Step 3: Create `src/components/AllocationRing.tsx`**

```tsx
import type { AllocationSlice } from '../data/types';

const COLORS = ['#22e6a4', '#3aa0ff', '#ffb020', '#8a5cff', '#5eead4', '#ff5c72'];

export function AllocationRing({ slices }: { slices: AllocationSlice[] }) {
  const top = slices.slice(0, 5);
  const rest = slices.slice(5).reduce((s, x) => s + x.pct, 0);
  const parts = rest > 0 ? [...top, { label: 'Other', valueUsd: 0, pct: rest }] : top;

  let acc = 0;
  const stops = parts
    .map((p, i) => {
      const from = acc;
      acc += p.pct;
      return `${COLORS[i % COLORS.length]} ${from}% ${acc}%`;
    })
    .join(', ');

  return (
    <div
      className="w-[120px] h-[120px] rounded-full"
      style={{
        background: `conic-gradient(${stops})`,
        WebkitMask: 'radial-gradient(circle 40px at 50% 50%, transparent 39px, #000 40px)',
        mask: 'radial-gradient(circle 40px at 50% 50%, transparent 39px, #000 40px)',
      }}
      aria-label="allocation ring"
    />
  );
}

export { COLORS };
```

- [ ] **Step 4: Create `src/components/ByChainBar.tsx`**

```tsx
import type { AllocationSlice } from '../data/types';
import { COLORS } from './AllocationRing';

export function ByChainBar({ slices }: { slices: AllocationSlice[] }) {
  return (
    <div>
      <div className="flex h-2 rounded overflow-hidden mt-1.5">
        {slices.map((s, i) => (
          <div key={s.label} style={{ width: `${s.pct}%`, background: COLORS[i % COLORS.length] }} />
        ))}
      </div>
      <div className="text-[11px] text-muted mt-1.5">
        {slices.map((s) => `${s.label} ${s.pct.toFixed(0)}%`).join(' · ')}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/AllocationPanel.tsx`**

```tsx
import { Panel, Label } from './primitives';
import { AllocationRing, COLORS } from './AllocationRing';
import { ByChainBar } from './ByChainBar';
import type { AllocationSlice } from '../data/types';

export function AllocationPanel({ byToken, byChain }: { byToken: AllocationSlice[]; byChain: AllocationSlice[] }) {
  const legend = byToken.slice(0, 4);
  return (
    <Panel>
      <Label>Allocation</Label>
      <div className="flex gap-3.5 items-center mt-3">
        <AllocationRing slices={byToken} />
        <div className="flex-1 text-[12px]">
          {legend.map((s, i) => (
            <div key={s.label} className="flex justify-between py-[3px]">
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2" style={{ background: COLORS[i % COLORS.length] }} />
                {s.label}
              </span>
              <span>{s.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3.5">
        <Label>By chain</Label>
        <ByChainBar slices={byChain} />
      </div>
    </Panel>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/AllocationPanel.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/AllocationRing.tsx src/components/ByChainBar.tsx src/components/AllocationPanel.tsx src/components/AllocationPanel.test.tsx
git commit -m "feat(ui): allocation ring, by-chain bar and allocation panel"
```

---

### Task 17: TotalBalance and PeriodToggle

**Files:**
- Create: `src/components/TotalBalance.tsx`
- Create: `src/components/PeriodToggle.tsx`
- Test: `src/components/TotalBalance.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/TotalBalance.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TotalBalance } from './TotalBalance';
import { PeriodToggle } from './PeriodToggle';

describe('TotalBalance', () => {
  it('formats the total and shows positive 24h in neon', () => {
    render(<TotalBalance total={12480.53} change24h={3.24} walletCount={2} />);
    expect(screen.getByText('$12,480.53')).toBeInTheDocument();
    expect(screen.getByText(/3.2%/)).toBeInTheDocument();
  });
});

describe('PeriodToggle', () => {
  it('calls onChange when a period is clicked', async () => {
    const onChange = vi.fn();
    render(<PeriodToggle value="30d" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '7d' }));
    expect(onChange).toHaveBeenCalledWith('7d');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/TotalBalance.test.tsx`
Expected: FAIL (cannot find module './TotalBalance').

- [ ] **Step 3: Create `src/components/TotalBalance.tsx`**

```tsx
import { Label } from './primitives';

export function TotalBalance({ total, change24h, walletCount }: { total: number; change24h: number; walletCount: number }) {
  const up = change24h >= 0;
  return (
    <div>
      <Label>{`Total balance · ${walletCount} wallet${walletCount === 1 ? '' : 's'}`}</Label>
      <div className="text-[34px] font-extrabold text-[#eafff6] tracking-tight">
        {total.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}
      </div>
      <div className={`text-[13px] font-bold mt-1 ${up ? 'text-neon' : 'text-danger'}`}>
        {`${up ? '▲' : '▼'} ${Math.abs(change24h).toFixed(1)}% · 24h`}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/PeriodToggle.tsx`**

```tsx
import type { Period } from '../state/store';

const PERIODS: Period[] = ['24h', '7d', '30d', 'all'];

export function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`text-[11px] px-2 py-0.5 rounded-full border ${
            p === value ? 'border-neon text-neon bg-neon/10' : 'border-border text-[#9fb0bd]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/TotalBalance.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/TotalBalance.tsx src/components/PeriodToggle.tsx src/components/TotalBalance.test.tsx
git commit -m "feat(ui): TotalBalance and PeriodToggle"
```

---

### Task 18: ValueChart (Recharts) and HeroPanel

**Files:**
- Create: `src/components/ValueChart.tsx`
- Create: `src/components/HeroPanel.tsx`
- Test: `src/components/HeroPanel.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/HeroPanel.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroPanel } from './HeroPanel';
import type { SnapshotPoint } from '../data/snapshot';

const series: SnapshotPoint[] = [
  { t: 1, v: 100 },
  { t: 2, v: 120 },
];

describe('HeroPanel', () => {
  it('shows the total and an empty-history hint when only one point exists', () => {
    render(
      <HeroPanel total={120} change24h={2} walletCount={1} period="30d" onPeriod={vi.fn()} series={[{ t: 1, v: 120 }]} />,
    );
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText(/builds as you use/i)).toBeInTheDocument();
  });

  it('renders the chart label when history exists', () => {
    render(<HeroPanel total={120} change24h={2} walletCount={1} period="30d" onPeriod={vi.fn()} series={series} />);
    expect(screen.getByText(/portfolio value/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/HeroPanel.test.tsx`
Expected: FAIL (cannot find module './HeroPanel').

- [ ] **Step 3: Create `src/components/ValueChart.tsx`**

```tsx
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import type { SnapshotPoint } from '../data/snapshot';

export function ValueChart({ series }: { series: SnapshotPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={series} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="cvfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22e6a4" stopOpacity={0.35} />
            <stop offset="1" stopColor="#22e6a4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area type="monotone" dataKey="v" stroke="#22e6a4" strokeWidth={2} fill="url(#cvfill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create `src/components/HeroPanel.tsx`**

```tsx
import { Panel, Label } from './primitives';
import { TotalBalance } from './TotalBalance';
import { PeriodToggle } from './PeriodToggle';
import { ValueChart } from './ValueChart';
import type { Period } from '../state/store';
import type { SnapshotPoint } from '../data/snapshot';

interface Props {
  total: number;
  change24h: number;
  walletCount: number;
  period: Period;
  onPeriod: (p: Period) => void;
  series: SnapshotPoint[];
}

export function HeroPanel({ total, change24h, walletCount, period, onPeriod, series }: Props) {
  return (
    <Panel>
      <div className="flex justify-between items-start gap-4">
        <TotalBalance total={total} change24h={change24h} walletCount={walletCount} />
        <PeriodToggle value={period} onChange={onPeriod} />
      </div>
      <div className="mt-2.5">
        {series.length < 2 ? (
          <div className="text-[11px] text-muted py-8 text-center">
            Your value chart builds as you use Coldview — check back over time.
          </div>
        ) : (
          <>
            <ValueChart series={series} />
            <Label>portfolio value · self-recorded snapshots</Label>
          </>
        )}
      </div>
    </Panel>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/HeroPanel.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/ValueChart.tsx src/components/HeroPanel.tsx src/components/HeroPanel.test.tsx
git commit -m "feat(ui): value chart and hero panel with empty-history hint"
```

---

### Task 19: WalletManager and ApiKeyControl

**Files:**
- Create: `src/components/WalletManager.tsx`
- Create: `src/components/ApiKeyControl.tsx`
- Test: `src/components/WalletManager.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/WalletManager.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletManager } from './WalletManager';
import type { Wallet } from '../data/walletStore';

const wallets: Wallet[] = [{ address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', label: 'Main' }];

describe('WalletManager', () => {
  it('renders wallet chips with a shortened address', () => {
    render(<WalletManager wallets={wallets} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/Main/)).toBeInTheDocument();
    expect(screen.getByText(/0x1a2b…9a0b/)).toBeInTheDocument();
  });

  it('removes a wallet when its × is clicked', async () => {
    const onRemove = vi.fn();
    render(<WalletManager wallets={wallets} onAdd={vi.fn()} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /remove Main/i }));
    expect(onRemove).toHaveBeenCalledWith(wallets[0].address);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/WalletManager.test.tsx`
Expected: FAIL (cannot find module './WalletManager').

- [ ] **Step 3: Create `src/components/WalletManager.tsx`**

```tsx
import { useState } from 'react';
import { isValidAddress, type Wallet } from '../data/walletStore';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

interface Props {
  wallets: Wallet[];
  onAdd: (address: string, label: string) => void;
  onRemove: (address: string) => void;
}

export function WalletManager({ wallets, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [addr, setAddr] = useState('');
  const [label, setLabel] = useState('');

  const submit = () => {
    if (!isValidAddress(addr)) return;
    onAdd(addr.trim(), label.trim() || 'Wallet');
    setAddr('');
    setLabel('');
    setAdding(false);
  };

  return (
    <div className="flex gap-2 items-center flex-wrap text-[12px]">
      {wallets.map((w) => (
        <span key={w.address} className="border border-neon text-neon rounded-full px-2.5 py-1 flex items-center gap-2">
          {w.label} · {short(w.address)}
          <button aria-label={`remove ${w.label}`} className="text-muted hover:text-danger" onClick={() => onRemove(w.address)}>
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <span className="flex gap-1">
          <input className="bg-panel border border-border rounded px-2 py-0.5 w-56 outline-none" placeholder="0x… address" value={addr} onChange={(e) => setAddr(e.target.value)} />
          <input className="bg-panel border border-border rounded px-2 py-0.5 w-20 outline-none" placeholder="label" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <button className="text-neon" onClick={submit}>save</button>
        </span>
      ) : (
        <button className="text-blue border border-[#22384a] rounded-full px-2.5 py-1" onClick={() => setAdding(true)}>
          + add
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/ApiKeyControl.tsx`**

```tsx
import { useState } from 'react';

export function ApiKeyControl({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="text-[11px]">
      <button className="text-muted border border-border rounded-full px-2.5 py-1" onClick={() => setOpen((o) => !o)}>
        ⚙ {value ? 'own key ✓' : 'own API key'}
      </button>
      {open && (
        <input
          className="ml-2 bg-panel border border-border rounded px-2 py-0.5 w-64 outline-none"
          placeholder="Alchemy API key (stored only in this browser)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </span>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/WalletManager.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/WalletManager.tsx src/components/ApiKeyControl.tsx src/components/WalletManager.test.tsx
git commit -m "feat(ui): WalletManager chips and optional BYOK ApiKeyControl"
```

---

### Task 20: ChainFilter, TopBar, ErrorBanner

**Files:**
- Create: `src/components/ChainFilter.tsx`
- Create: `src/components/TopBar.tsx`
- Create: `src/components/ErrorBanner.tsx`
- Test: `src/components/ChainFilter.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/ChainFilter.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChainFilter } from './ChainFilter';

describe('ChainFilter', () => {
  it('marks enabled chains and toggles on click', async () => {
    const onToggle = vi.fn();
    render(<ChainFilter enabled={['ethereum', 'base']} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Arbitrum' }));
    expect(onToggle).toHaveBeenCalledWith('arbitrum');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ChainFilter.test.tsx`
Expected: FAIL (cannot find module './ChainFilter').

- [ ] **Step 3: Create `src/components/ChainFilter.tsx`**

```tsx
import { CHAINS } from '../config/chains';
import { Label } from './primitives';
import type { ChainId } from '../data/types';

export function ChainFilter({ enabled, onToggle }: { enabled: ChainId[]; onToggle: (id: ChainId) => void }) {
  return (
    <div className="flex gap-1.5 items-center flex-wrap mb-3.5">
      <span className="mr-1"><Label>chains</Label></span>
      {CHAINS.map((c) => {
        const on = enabled.includes(c.id);
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${on ? 'border-neon text-neon bg-neon/10' : 'border-border text-[#9fb0bd]'}`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/TopBar.tsx`**

```tsx
import { WalletManager } from './WalletManager';
import { ApiKeyControl } from './ApiKeyControl';
import type { Wallet } from '../data/walletStore';

interface Props {
  wallets: Wallet[];
  onAdd: (address: string, label: string) => void;
  onRemove: (address: string) => void;
  apiKey: string;
  onApiKey: (k: string) => void;
}

export function TopBar({ wallets, onAdd, onRemove, apiKey, onApiKey }: Props) {
  return (
    <div className="flex items-center justify-between mb-3.5 gap-4 flex-wrap">
      <div className="font-extrabold text-[#eafff6] tracking-wide">◈ Coldview<span className="text-neon">.</span></div>
      <div className="flex items-center gap-2 flex-wrap">
        <WalletManager wallets={wallets} onAdd={onAdd} onRemove={onRemove} />
        <ApiKeyControl value={apiKey} onChange={onApiKey} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/ErrorBanner.tsx`**

```tsx
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border border-danger/40 bg-danger/10 text-danger rounded-lg px-3 py-2 text-[12px] mb-3">
      {message}
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/ChainFilter.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ChainFilter.tsx src/components/TopBar.tsx src/components/ErrorBanner.tsx src/components/ChainFilter.test.tsx
git commit -m "feat(ui): ChainFilter, TopBar and ErrorBanner"
```

---

### Task 21: App assembly and providers

**Files:**
- Create: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test `src/App.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useAppStore } from './state/store';

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState(useAppStore.getInitialState());
});

describe('App', () => {
  it('shows the onboarding EmptyState when no wallets are stored', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/wallet address/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (App has default Vite content, no wallet input).

- [ ] **Step 3: Create `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useAppStore } from './state/store';
import { usePortfolio } from './state/usePortfolio';
import { getSnapshots, type SnapshotPoint } from './data/snapshot';
import { TopBar } from './components/TopBar';
import { ChainFilter } from './components/ChainFilter';
import { HeroPanel } from './components/HeroPanel';
import { AllocationPanel } from './components/AllocationPanel';
import { HoldingsTable } from './components/HoldingsTable';
import { EmptyState } from './components/EmptyState';
import { ErrorBanner } from './components/ErrorBanner';
import { LoadingSkeleton, PrivacyNote } from './components/primitives';

export default function App() {
  const { wallets, enabledChains, period, byokKey, addWallet, removeWallet, toggleChain, setPeriod, setApiKey } = useAppStore();
  const { data, isLoading, isError } = usePortfolio(wallets, enabledChains);
  const [series, setSeries] = useState<SnapshotPoint[]>([]);

  useEffect(() => {
    getSnapshots().then(setSeries);
  }, [data?.totalValueUsd]);

  if (wallets.length === 0) {
    return <div className="p-4 max-w-6xl mx-auto"><EmptyState onAdd={(a) => addWallet(a, 'Main')} /></div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <TopBar wallets={wallets} onAdd={addWallet} onRemove={removeWallet} apiKey={byokKey} onApiKey={setApiKey} />
      <ChainFilter enabled={enabledChains} onToggle={toggleChain} />

      {isError && <ErrorBanner message="Couldn't load some data. It'll retry automatically." />}

      {isLoading || !data ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3 mb-3">
            <HeroPanel
              total={data.totalValueUsd}
              change24h={data.change24hPct}
              walletCount={wallets.length}
              period={period}
              onPeriod={setPeriod}
              series={series}
            />
            <AllocationPanel byToken={data.byToken} byChain={data.byChain} />
          </div>
          <HoldingsTable holdings={data.holdings} />
        </>
      )}
      <PrivacyNote />
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 6: Run the full unit suite and build**

Run: `npm test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/main.tsx src/App.test.tsx
git commit -m "feat(ui): assemble App with providers, loading and error states"
```

---

## Phase E — End-to-end and deployment

### Task 22: Playwright e2e (add address → dashboard renders)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/dashboard.spec.ts`

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:5173' },
});
```

- [ ] **Step 2: Create `tests/e2e/dashboard.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('add an address and see the dashboard', async ({ page }) => {
  // Mock all network so the test is deterministic and offline.
  await page.route('**/api/v2/addresses/*/token-balances', (route) =>
    route.fulfill({ json: [{ token: { address: '0xARB', symbol: 'ARB', decimals: '18', type: 'ERC-20' }, value: '1000000000000000000' }] }),
  );
  await page.route('**/api/v2/addresses/*', (route) =>
    route.fulfill({ json: { coin_balance: '0' } }),
  );
  await page.route('**/coins.llama.fi/**', (route) =>
    route.fulfill({ json: { coins: { 'arbitrum:0xarb': { price: 2 } } } }),
  );

  await page.goto('/');
  await page.getByPlaceholder(/wallet address/i).fill('0x' + 'a'.repeat(40));
  await page.getByRole('button', { name: /add/i }).click();

  await expect(page.getByText('ARB')).toBeVisible();
  await expect(page.getByText('$2', { exact: false })).toBeVisible();
});
```

- [ ] **Step 3: Install the Playwright browser**

Run: `npx playwright install chromium`
Expected: chromium downloaded.

- [ ] **Step 4: Run the e2e test**

Run: `npm run e2e`
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/dashboard.spec.ts
git commit -m "test(e2e): add-address flow renders holdings (mocked network)"
```

---

### Task 23: CI, README, and static deploy

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - run: npm run e2e
```

- [ ] **Step 2: Create `README.md`**

```markdown
# ◈ Coldview

[![CI](https://github.com/090TYPE/Coldview/actions/workflows/ci.yml/badge.svg)](https://github.com/090TYPE/Coldview/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A **private, read-only crypto portfolio dashboard**. Paste EVM wallet addresses and see one
clean picture of your holdings — total value, allocation, 24h change, and a value-over-time
chart. Everything runs in your browser: **your addresses never touch a server.**

## Why it's different

- 🔒 **Fully client-side.** Addresses and history live in your browser (localStorage +
  IndexedDB). No accounts, no backend, nothing to leak.
- ⚡ **Zero setup.** Works out of the box on keyless public data (Blockscout for balances,
  DefiLlama for prices). Optionally paste your own free Alchemy key for richer data.
- 🧾 **Multi-wallet, multi-chain.** Aggregates across Ethereum, Arbitrum, Base, Polygon and
  Optimism.

## Stack

React 19 · TypeScript · Vite · Tailwind · Zustand · TanStack Query · Recharts.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (Vitest)
npm run e2e      # end-to-end (Playwright)
npm run build    # static production build -> dist/
```

## Privacy

Coldview makes read-only calls to public block explorers and price APIs to display balances.
It never transmits your addresses to any Coldview-operated server (there isn't one). Your
optional Alchemy key is stored only in your browser.
```

- [ ] **Step 3: Verify the production build one more time**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: add test+build+e2e workflow and project README"
```

- [ ] **Step 5: Manual deploy note (not a code step)**

After the repo is pushed to GitHub, enable Pages (or import to Vercel). For GitHub Pages
with the `./` base already set in `vite.config.ts`, publish the `dist/` output via a Pages
action or the `gh-pages` branch. No environment variables are required — the app ships no
secrets.

---

## Notes on scope

This plan implements **Phase 1 only** (EVM wallets, client-only). Solana/Bitcoin (Phase 2),
CEX read-only keys (Phase 3), and P&L / transaction history are explicitly out of scope and
will each get their own spec and plan. Do not add them here.

**BYOK Alchemy provider — decided (a):** ship the **keyless** default (Blockscout + DefiLlama)
for Phase 1. The `ApiKeyControl` UI stays but the Alchemy provider that uses the stored key is a
fast-follow (Alchemy needs extra `getTokenMetadata` calls that Blockscout already returns keyless
— marginal value now). Keep the control's copy honest ("used when available") until wired.
