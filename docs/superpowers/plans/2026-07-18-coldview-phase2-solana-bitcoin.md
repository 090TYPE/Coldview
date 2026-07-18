# Coldview Phase 2 Implementation Plan (Solana + Bitcoin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Coldview beyond EVM to Solana (SOL + SPL tokens) and Bitcoin (BTC), keeping the client-only, keyless, privacy-first model — the same dashboard aggregates all three families.

**Architecture:** Generalize the EVM-centric parts in place. A `Family = 'evm' | 'solana' | 'bitcoin'` is detected from the address format; each `ChainInfo` declares its family; `fetchBalances` dispatches on family to the existing Blockscout code, a new Solana RPC provider, or a new Bitcoin esplora provider. Wallets store their detected family and are queried only on compatible chains. The chain-agnostic aggregation, snapshot store, and UI are unchanged.

**Tech Stack:** Existing (React 19, TS, Vite, Tailwind, Zustand, TanStack Query, Recharts, Vitest, Playwright). Data: Solana JSON-RPC (`solana-rpc.publicnode.com`), Bitcoin esplora (`blockstream.info`), DefiLlama prices — all keyless + CORS.

---

## File Structure

**New:**
```
src/data/family.ts               # Family type + detectFamily(address)
src/data/parseSolana.ts          # Solana RPC JSON -> TokenBalance[]
src/data/parseEsplora.ts         # esplora address JSON -> BTC TokenBalance
src/data/solanaProvider.ts       # fetchSolanaBalances(address)
src/data/bitcoinProvider.ts      # fetchBitcoinBalance(address)
tests/fixtures/solana-accounts.json
tests/fixtures/esplora-address.json
```

**Modified:**
```
src/data/types.ts                # ChainId += solana|bitcoin; ChainInfo += family/rpcUrl/esploraBaseUrl; Price += symbol?
src/config/chains.ts             # family on EVM entries; add solana + bitcoin
src/data/walletStore.ts          # Wallet += family; isValidAddress via detectFamily; loadWallets backfill
src/state/store.ts               # addWallet computes family, per-family normalization
src/data/balanceProvider.ts      # extract fetchEvmBalances; dispatch on family
src/data/parseDefiLlama.ts       # SOL/BTC natives; Solana exact-case key; read symbol
src/data/aggregate.ts            # holding symbol fallback (price.symbol / short mint)
src/state/usePortfolio.ts        # pair wallets only with same-family enabled chains
```

`ChainFilter` maps over `CHAINS`, so adding Solana/Bitcoin to the registry surfaces their chips automatically — no change needed there. `WalletManager` / `EmptyState` call the generalized `isValidAddress` — no change needed.

---

## Task 1: Family detection

**Files:**
- Create: `src/data/family.ts`
- Test: `src/data/family.test.ts`

- [ ] **Step 1: Write the failing test `src/data/family.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { detectFamily } from './family';

describe('detectFamily', () => {
  it('detects an EVM address', () => {
    expect(detectFamily('0x' + 'a'.repeat(40))).toBe('evm');
    expect(detectFamily('0x' + 'A'.repeat(40))).toBe('evm');
  });
  it('detects a Bitcoin bech32 address', () => {
    expect(detectFamily('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe('bitcoin');
  });
  it('detects a Bitcoin legacy address', () => {
    expect(detectFamily('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('bitcoin');
    expect(detectFamily('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe('bitcoin');
  });
  it('detects a Solana address', () => {
    expect(detectFamily('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs')).toBe('solana');
  });
  it('returns null for garbage', () => {
    expect(detectFamily('nope')).toBeNull();
    expect(detectFamily('')).toBeNull();
    expect(detectFamily('0x123')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/family.test.ts`
Expected: FAIL (cannot find module './family').

- [ ] **Step 3: Create `src/data/family.ts`**

```ts
export type Family = 'evm' | 'solana' | 'bitcoin';

const EVM_RE = /^0x[0-9a-fA-F]{40}$/;
const BTC_BECH32_RE = /^bc1[0-9ac-hj-np-z]{6,87}$/; // bech32 charset, lowercase
const BTC_LEGACY_RE = /^[13][1-9A-HJ-NP-Za-km-z]{25,33}$/; // base58check, 26-34 chars
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/; // base58, 32-44 chars

// Detection order matters: EVM and bech32 are unambiguous; Bitcoin legacy
// ([13], <=34 chars) is checked before Solana. Note: a Solana address that
// starts with 1 or 3 and is <=34 chars could be mis-detected as Bitcoin legacy,
// but real Solana addresses are almost always 43-44 chars, so this is negligible.
export function detectFamily(address: string): Family | null {
  const a = address.trim();
  if (EVM_RE.test(a)) return 'evm';
  if (BTC_BECH32_RE.test(a)) return 'bitcoin';
  if (BTC_LEGACY_RE.test(a)) return 'bitcoin';
  if (SOLANA_RE.test(a)) return 'solana';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/family.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/family.ts src/data/family.test.ts
git commit -m "feat(data): address family detection for EVM/Solana/Bitcoin"
```

---

## Task 2: Generalize types and chain registry

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/config/chains.ts`
- Test: `src/config/chains.test.ts` (extend)

- [ ] **Step 1: Extend the failing test in `src/config/chains.test.ts`**

Replace the whole file with:
```ts
import { describe, it, expect } from 'vitest';
import { CHAINS, getChain } from './chains';

describe('chain registry', () => {
  it('includes the five EVM chains plus Solana and Bitcoin', () => {
    expect(CHAINS.map((c) => c.id)).toEqual([
      'ethereum', 'arbitrum', 'base', 'polygon', 'optimism', 'solana', 'bitcoin',
    ]);
  });
  it('tags each chain with a family', () => {
    expect(getChain('ethereum').family).toBe('evm');
    expect(getChain('solana').family).toBe('solana');
    expect(getChain('bitcoin').family).toBe('bitcoin');
  });
  it('EVM chains keep a Blockscout URL; Solana has an rpcUrl; Bitcoin has an esploraBaseUrl', () => {
    expect(getChain('base').blockscoutBaseUrl).toMatch(/^https:\/\//);
    expect(getChain('solana').rpcUrl).toMatch(/^https:\/\//);
    expect(getChain('bitcoin').esploraBaseUrl).toMatch(/^https:\/\//);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/chains.test.ts`
Expected: FAIL (solana/bitcoin missing; `family` undefined).

- [ ] **Step 3: Update `src/data/types.ts`** — replace the `ChainId`, `ChainInfo`, and `Price` declarations (lines 1–9 and 21–24) so the file's top becomes:

```ts
import type { Family } from './family';

export type ChainId =
  | 'ethereum' | 'arbitrum' | 'base' | 'polygon' | 'optimism'
  | 'solana' | 'bitcoin';

export interface ChainInfo {
  id: ChainId;
  name: string;
  nativeSymbol: string;
  family: Family;
  color: string;
  blockscoutBaseUrl?: string; // EVM only
  rpcUrl?: string;            // Solana only
  esploraBaseUrl?: string;    // Bitcoin only
}
```

And change the `Price` interface to add an optional symbol:
```ts
export interface Price {
  usd: number;
  change24hPct: number;
  symbol?: string;
}
```

Leave `TokenBalance`, `Holding`, `AllocationSlice`, `PortfolioSnapshot`, `keyOf`, and `toAmount` exactly as they are.

- [ ] **Step 4: Replace `src/config/chains.ts` with:**

```ts
import type { ChainId, ChainInfo } from '../data/types';

export const CHAINS: ChainInfo[] = [
  { id: 'ethereum', name: 'Ethereum', nativeSymbol: 'ETH', family: 'evm', color: '#3aa0ff', blockscoutBaseUrl: 'https://eth.blockscout.com' },
  { id: 'arbitrum', name: 'Arbitrum', nativeSymbol: 'ETH', family: 'evm', color: '#22e6a4', blockscoutBaseUrl: 'https://arbitrum.blockscout.com' },
  { id: 'base', name: 'Base', nativeSymbol: 'ETH', family: 'evm', color: '#5eead4', blockscoutBaseUrl: 'https://base.blockscout.com' },
  { id: 'polygon', name: 'Polygon', nativeSymbol: 'POL', family: 'evm', color: '#8a5cff', blockscoutBaseUrl: 'https://polygon.blockscout.com' },
  { id: 'optimism', name: 'Optimism', nativeSymbol: 'ETH', family: 'evm', color: '#ffb020', blockscoutBaseUrl: 'https://optimism.blockscout.com' },
  { id: 'solana', name: 'Solana', nativeSymbol: 'SOL', family: 'solana', color: '#14f195', rpcUrl: 'https://solana-rpc.publicnode.com' },
  { id: 'bitcoin', name: 'Bitcoin', nativeSymbol: 'BTC', family: 'bitcoin', color: '#f7931a', esploraBaseUrl: 'https://blockstream.info' },
];

export function getChain(id: ChainId): ChainInfo {
  const c = CHAINS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chain: ${id}`);
  return c;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/config/chains.test.ts`
Expected: PASS. Then `npm test` to confirm nothing else broke.

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/config/chains.ts src/config/chains.test.ts
git commit -m "feat(data): generalize ChainInfo with family + Solana/Bitcoin registry entries"
```

---

## Task 3: Wallet family + validation + migration

**Files:**
- Modify: `src/data/walletStore.ts`
- Test: `src/data/walletStore.test.ts` (extend)

- [ ] **Step 1: Extend the failing test — replace `src/data/walletStore.test.ts` with:**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWallets, saveWallets, isValidAddress, loadApiKey, saveApiKey } from './walletStore';

beforeEach(() => localStorage.clear());

describe('isValidAddress', () => {
  it('accepts EVM, Solana and Bitcoin addresses', () => {
    expect(isValidAddress('0x' + 'a'.repeat(40))).toBe(true);
    expect(isValidAddress('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs')).toBe(true);
    expect(isValidAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true);
  });
  it('rejects malformed input', () => {
    expect(isValidAddress('nope')).toBe(false);
    expect(isValidAddress('0x123')).toBe(false);
  });
});

describe('wallet persistence', () => {
  it('round-trips wallets including family', () => {
    saveWallets([{ address: '0xabc', label: 'Main', family: 'evm' }]);
    expect(loadWallets()).toEqual([{ address: '0xabc', label: 'Main', family: 'evm' }]);
  });
  it('backfills family for legacy wallets stored without one', () => {
    localStorage.setItem('coldview:wallets', JSON.stringify([{ address: '0x' + 'a'.repeat(40), label: 'Old' }]));
    expect(loadWallets()[0].family).toBe('evm');
  });
  it('drops legacy wallets whose address no longer detects to a family', () => {
    localStorage.setItem('coldview:wallets', JSON.stringify([{ address: 'garbage', label: 'X' }]));
    expect(loadWallets()).toEqual([]);
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
Expected: FAIL (Wallet has no `family`; Solana/BTC rejected).

- [ ] **Step 3: Replace `src/data/walletStore.ts` with:**

```ts
import { detectFamily, type Family } from './family';

export interface Wallet {
  address: string;
  label: string;
  family: Family;
}

const WALLETS_KEY = 'coldview:wallets';
const APIKEY_KEY = 'coldview:apikey';

export function isValidAddress(addr: string): boolean {
  return detectFamily(addr) !== null;
}

interface StoredWallet {
  address: string;
  label: string;
  family?: Family;
}

export function loadWallets(): Wallet[] {
  try {
    const raw = localStorage.getItem(WALLETS_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredWallet[];
    const out: Wallet[] = [];
    for (const w of stored) {
      const family = w.family ?? detectFamily(w.address); // backfill legacy wallets
      if (!family) continue; // drop wallets we can no longer classify
      out.push({ address: w.address, label: w.label, family });
    }
    return out;
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
git commit -m "feat(data): wallet family field, multi-family validation, legacy backfill"
```

---

## Task 4: addWallet computes family and normalizes per family

**Files:**
- Modify: `src/state/store.ts`
- Test: `src/state/store.test.ts` (extend)

- [ ] **Step 1: Add failing tests to `src/state/store.test.ts`** — inside the existing `describe('app store', ...)` block, add:

```ts
  it('adds a Solana wallet without lowercasing its case-sensitive address', () => {
    const addr = '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs';
    useAppStore.getState().addWallet(addr, 'Sol');
    const w = useAppStore.getState().wallets[0];
    expect(w.address).toBe(addr); // unchanged case
    expect(w.family).toBe('solana');
  });

  it('lowercases EVM addresses and tags them evm', () => {
    useAppStore.getState().addWallet('0x' + 'A'.repeat(40), 'Main');
    const w = useAppStore.getState().wallets[0];
    expect(w.address).toBe('0x' + 'a'.repeat(40));
    expect(w.family).toBe('evm');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/store.test.ts`
Expected: FAIL (Solana address gets lowercased / no family).

- [ ] **Step 3: Update `addWallet` in `src/state/store.ts`** — replace the `addWallet` function (lines 28–35) with:

```ts
  addWallet: (address, label) => {
    const family = detectFamily(address);
    if (!family) return;
    // Only EVM addresses are case-insensitive; Solana/Bitcoin are case-sensitive.
    const normalized = family === 'evm' ? address.trim().toLowerCase() : address.trim();
    if (get().wallets.some((w) => w.address === normalized)) return;
    const wallets = [...get().wallets, { address: normalized, label: label.trim() || 'Wallet', family }];
    saveWallets(wallets);
    set({ wallets });
  },
```

And update the import line at the top (line 4–6) to also import `detectFamily`:
```ts
import { detectFamily } from '../data/family';
import {
  loadWallets, saveWallets, loadApiKey, saveApiKey, type Wallet,
} from '../data/walletStore';
```
(Note: `isValidAddress` is no longer used in this file — remove it from the import to avoid an unused-import error.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/store.test.ts`
Expected: PASS (all store tests). Then `npm run build` to confirm no unused-import/type errors.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.ts src/state/store.test.ts
git commit -m "feat(state): detect family on addWallet, preserve case for non-EVM"
```

---

## Task 5: Solana balance parser

**Files:**
- Create: `tests/fixtures/solana-accounts.json`
- Create: `src/data/parseSolana.ts`
- Test: `src/data/parseSolana.test.ts`

- [ ] **Step 1: Create fixture `tests/fixtures/solana-accounts.json`** (shape of a `getTokenAccountsByOwner` jsonParsed result's `value` array):

```json
[
  {
    "account": {
      "data": {
        "parsed": {
          "info": {
            "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "tokenAmount": { "amount": "3120000", "decimals": 6, "uiAmountString": "3.12" }
          }
        }
      }
    }
  },
  {
    "account": {
      "data": {
        "parsed": {
          "info": {
            "mint": "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ",
            "tokenAmount": { "amount": "0", "decimals": 9, "uiAmountString": "0" }
          }
        }
      }
    }
  }
]
```

- [ ] **Step 2: Write the failing test `src/data/parseSolana.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/solana-accounts.json';
import { parseSolanaTokenAccounts, solanaNativeBalance } from './parseSolana';

describe('parseSolanaTokenAccounts', () => {
  it('normalizes SPL token accounts and skips zero balances; symbol is empty (filled later)', () => {
    const out = parseSolanaTokenAccounts(fixture);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      chainId: 'solana',
      contract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: '',
      decimals: 6,
      rawBalance: '3120000',
    });
  });
});

describe('solanaNativeBalance', () => {
  it('builds a SOL TokenBalance from lamports', () => {
    expect(solanaNativeBalance(1500000000)).toEqual({
      chainId: 'solana', contract: null, symbol: 'SOL', decimals: 9, rawBalance: '1500000000',
    });
  });
  it('returns null for a zero SOL balance', () => {
    expect(solanaNativeBalance(0)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/parseSolana.test.ts`
Expected: FAIL (cannot find module './parseSolana').

- [ ] **Step 4: Create `src/data/parseSolana.ts`**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/parseSolana.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/parseSolana.ts src/data/parseSolana.test.ts tests/fixtures/solana-accounts.json
git commit -m "feat(data): Solana native + SPL token account parser"
```

---

## Task 6: Bitcoin (esplora) balance parser

**Files:**
- Create: `tests/fixtures/esplora-address.json`
- Create: `src/data/parseEsplora.ts`
- Test: `src/data/parseEsplora.test.ts`

- [ ] **Step 1: Create fixture `tests/fixtures/esplora-address.json`** (shape of `GET /api/address/{addr}`):

```json
{
  "address": "bc1qexample",
  "chain_stats": { "funded_txo_sum": 150000000, "spent_txo_sum": 50000000 },
  "mempool_stats": { "funded_txo_sum": 0, "spent_txo_sum": 0 }
}
```

- [ ] **Step 2: Write the failing test `src/data/parseEsplora.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fixture from '../../tests/fixtures/esplora-address.json';
import { parseEsploraBalance } from './parseEsplora';

describe('parseEsploraBalance', () => {
  it('computes BTC balance in sats from funded minus spent (chain + mempool)', () => {
    // (150000000 - 50000000) + (0 - 0) = 100000000 sats = 1 BTC
    const out = parseEsploraBalance(fixture);
    expect(out).toEqual({
      chainId: 'bitcoin', contract: null, symbol: 'BTC', decimals: 8, rawBalance: '100000000',
    });
  });
  it('returns null for a zero balance', () => {
    const zero = { chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0 }, mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } };
    expect(parseEsploraBalance(zero)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/parseEsplora.test.ts`
Expected: FAIL (cannot find module './parseEsplora').

- [ ] **Step 4: Create `src/data/parseEsplora.ts`**

```ts
import type { TokenBalance } from './types';

interface EsploraStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
}
interface EsploraAddress {
  chain_stats?: EsploraStats;
  mempool_stats?: EsploraStats;
}

export function parseEsploraBalance(raw: unknown): TokenBalance | null {
  const info = raw as EsploraAddress;
  const cs = info?.chain_stats;
  if (!cs) return null;
  const ms = info.mempool_stats ?? { funded_txo_sum: 0, spent_txo_sum: 0 };
  const sats = (cs.funded_txo_sum - cs.spent_txo_sum) + (ms.funded_txo_sum - ms.spent_txo_sum);
  if (sats <= 0) return null;
  return { chainId: 'bitcoin', contract: null, symbol: 'BTC', decimals: 8, rawBalance: String(sats) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/parseEsplora.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/parseEsplora.ts src/data/parseEsplora.test.ts tests/fixtures/esplora-address.json
git commit -m "feat(data): Bitcoin esplora balance parser"
```

---

## Task 7: Solana + Bitcoin fetch providers

**Files:**
- Create: `src/data/solanaProvider.ts`
- Create: `src/data/bitcoinProvider.ts`
- Test: `src/data/nonEvmProviders.test.ts`

- [ ] **Step 1: Write the failing test `src/data/nonEvmProviders.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSolanaBalances } from './solanaProvider';
import { fetchBitcoinBalance } from './bitcoinProvider';

afterEach(() => vi.restoreAllMocks());

describe('fetchSolanaBalances', () => {
  it('returns SOL + SPL balances from RPC', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      if (body.method === 'getBalance') {
        return { ok: true, json: async () => ({ result: { value: 2000000000 } }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({ result: { value: [
          { account: { data: { parsed: { info: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenAmount: { amount: '3120000', decimals: 6 } } } } } } },
        ] } }),
      } as Response;
    }));
    const out = await fetchSolanaBalances('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs');
    expect(out.map((t) => t.symbol)).toEqual(['SOL', '']);
    expect(out.find((t) => t.contract)?.contract).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });
});

describe('fetchBitcoinBalance', () => {
  it('returns a single BTC balance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ chain_stats: { funded_txo_sum: 150000000, spent_txo_sum: 50000000 }, mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } }),
    } as Response)));
    const out = await fetchBitcoinBalance('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ symbol: 'BTC', rawBalance: '100000000' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/nonEvmProviders.test.ts`
Expected: FAIL (cannot find module './solanaProvider').

- [ ] **Step 3: Create `src/data/solanaProvider.ts`**

```ts
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
  const [bal, tokens] = await Promise.all([
    rpc(url, 'getBalance', [address]),
    rpc(url, 'getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM }, { encoding: 'jsonParsed' }]),
  ]);
  const out: TokenBalance[] = [];
  const native = solanaNativeBalance(bal?.result?.value ?? 0);
  if (native) out.push(native);
  out.push(...parseSolanaTokenAccounts(tokens?.result?.value ?? []));
  return out;
}
```

- [ ] **Step 4: Create `src/data/bitcoinProvider.ts`**

```ts
import { getChain } from '../config/chains';
import { parseEsploraBalance } from './parseEsplora';
import type { TokenBalance } from './types';

export async function fetchBitcoinBalance(address: string): Promise<TokenBalance[]> {
  const base = getChain('bitcoin').esploraBaseUrl!;
  const res = await fetch(`${base}/api/address/${address}`);
  if (!res.ok) return [];
  const btc = parseEsploraBalance(await res.json());
  return btc ? [btc] : [];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/nonEvmProviders.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/solanaProvider.ts src/data/bitcoinProvider.ts src/data/nonEvmProviders.test.ts
git commit -m "feat(data): Solana RPC and Bitcoin esplora fetch providers"
```

---

## Task 8: balanceProvider dispatches on family

**Files:**
- Modify: `src/data/balanceProvider.ts`
- Test: `src/data/providers.test.ts` (extend)

- [ ] **Step 1: Add a failing test to `src/data/providers.test.ts`** — add this `describe` block at the end of the file. Do NOT add a new import: `fetchBalances` is already imported at the top of this file from Phase 1 (verify with a quick grep; only add the import if it is genuinely missing).

```ts
describe('fetchBalances dispatch', () => {
  it('routes a bitcoin chain to the esplora provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ chain_stats: { funded_txo_sum: 100000000, spent_txo_sum: 0 }, mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 } }),
    } as Response)));
    const out = await fetchBalances('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'bitcoin');
    expect(out[0].symbol).toBe('BTC');
  });
});
```

(The file already imports `vi`, `describe`, `it`, `expect`, `afterEach` at the top — reuse them; only add the `fetchBalances` import if it is not already imported.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/providers.test.ts`
Expected: FAIL (bitcoin routed to Blockscout → wrong/empty result).

- [ ] **Step 3: Replace `src/data/balanceProvider.ts` with:**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/providers.test.ts`
Expected: PASS (existing EVM tests + the new bitcoin dispatch test).

- [ ] **Step 5: Commit**

```bash
git add src/data/balanceProvider.ts src/data/providers.test.ts
git commit -m "feat(data): fetchBalances dispatches to EVM/Solana/Bitcoin by family"
```

---

## Task 9: DefiLlama keys for SOL/BTC + Solana exact-case + symbols

**Files:**
- Modify: `src/data/parseDefiLlama.ts`
- Test: `src/data/parseDefiLlama.test.ts` (extend)

- [ ] **Step 1: Add failing tests to `src/data/parseDefiLlama.test.ts`** — add this `describe` block at the end:

```ts
import { defiLlamaKeys as keys2, parseDefiLlamaPrices as parse2 } from './parseDefiLlama';
import { keyOf as keyOf2 } from './types';

describe('DefiLlama Solana/Bitcoin support', () => {
  it('maps SOL and BTC natives to coingecko ids', () => {
    const req = keys2([
      { chainId: 'solana', contract: null, symbol: 'SOL', decimals: 9, rawBalance: '1' },
      { chainId: 'bitcoin', contract: null, symbol: 'BTC', decimals: 8, rawBalance: '1' },
    ]);
    expect(req.llamaKeys).toContain('coingecko:solana');
    expect(req.llamaKeys).toContain('coingecko:bitcoin');
  });

  it('keeps SPL mint case exact in the outgoing key', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const req = keys2([{ chainId: 'solana', contract: mint, symbol: '', decimals: 6, rawBalance: '1' }]);
    expect(req.llamaKeys).toContain(`solana:${mint}`); // NOT lowercased
    expect(req.byLlamaKey[`solana:${mint}`]).toBe(keyOf2('solana', mint));
  });

  it('reads the symbol from the DefiLlama response', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const req = keys2([{ chainId: 'solana', contract: mint, symbol: '', decimals: 6, rawBalance: '1' }]);
    const prices = parse2({ coins: { [`solana:${mint}`]: { price: 1.0, symbol: 'USDC' } } }, req.byLlamaKey);
    const p = prices[keyOf2('solana', mint)];
    expect(p.usd).toBe(1.0);
    expect(p.symbol).toBe('USDC');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/parseDefiLlama.test.ts`
Expected: FAIL (no SOL/BTC natives; SPL key lowercased; symbol undefined).

- [ ] **Step 3: Replace `src/data/parseDefiLlama.ts` with:**

```ts
import { keyOf } from './types';
import type { TokenBalance, TokenKey, Price } from './types';

// Native coin -> CoinGecko id used by DefiLlama's `coingecko:` namespace.
const NATIVE_COINGECKO: Record<string, string> = {
  ETH: 'ethereum',
  POL: 'matic-network',
  SOL: 'solana',
  BTC: 'bitcoin',
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
    } else if (b.chainId === 'solana') {
      // Solana mints are base58 and case-sensitive — do NOT lowercase.
      llamaKey = `solana:${b.contract}`;
    } else {
      llamaKey = `${b.chainId}:${b.contract.toLowerCase()}`;
    }
    set.add(llamaKey);
    byLlamaKey[llamaKey] = ourKey;
  }
  return { llamaKeys: [...set], byLlamaKey };
}

interface LlamaResponse {
  coins: Record<string, { price: number; symbol?: string; confidence?: number }>;
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
    out[ourKey] = { usd: data.price, change24hPct: 0, symbol: data.symbol };
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/parseDefiLlama.test.ts`
Expected: PASS (old + new tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/parseDefiLlama.ts src/data/parseDefiLlama.test.ts
git commit -m "feat(data): DefiLlama SOL/BTC natives, exact-case SPL keys, symbol passthrough"
```

---

## Task 10: aggregate fills missing symbols from price / mint

**Files:**
- Modify: `src/data/aggregate.ts`
- Test: `src/data/aggregate.test.ts` (extend)

- [ ] **Step 1: Add a failing test to `src/data/aggregate.test.ts`** — add this `it` inside the existing `describe('aggregatePortfolio', ...)` block:

```ts
  it('fills an empty token symbol from the price symbol, else a short mint', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const noName = 'So1111111111111111111111111111111111111112';
    const balances = [
      bal({ chainId: 'solana', contract: mint, symbol: '', decimals: 6, rawBalance: '1000000' }),
      bal({ chainId: 'solana', contract: noName, symbol: '', decimals: 0, rawBalance: '5' }),
    ];
    const snap = aggregatePortfolio(balances, prices({
      [keyOf('solana', mint)]: { usd: 1, change24hPct: 0, symbol: 'USDC' },
      [keyOf('solana', noName)]: { usd: 1, change24hPct: 0 },
    }));
    const bySym = Object.fromEntries(snap.holdings.map((h) => [h.key, h.symbol]));
    expect(bySym[keyOf('solana', mint)]).toBe('USDC');
    expect(bySym[keyOf('solana', noName)]).toBe('So11…1112'); // short mint fallback
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/aggregate.test.ts`
Expected: FAIL (symbol is empty string, no fallback).

- [ ] **Step 3: Update `src/data/aggregate.ts`** — in the pricing loop (the `for (const [k, b] of merged)` block), replace the line that builds the holding so the symbol has a fallback. Change:

```ts
    holdings.push({ key: k, chainId: b.chainId, symbol: b.symbol, amount, priceUsd, valueUsd, change24hPct });
```

to:

```ts
    const symbol = b.symbol || price?.symbol || shortMint(b.contract);
    holdings.push({ key: k, chainId: b.chainId, symbol, amount, priceUsd, valueUsd, change24hPct });
```

And add this helper at the bottom of the file (after `groupSlices`):

```ts
function shortMint(contract: string | null): string {
  if (!contract) return '???';
  return contract.length > 8 ? `${contract.slice(0, 4)}…${contract.slice(-4)}` : contract;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/aggregate.test.ts`
Expected: PASS (all aggregate tests — existing ones use non-empty `b.symbol`, so they keep their symbols).

- [ ] **Step 5: Commit**

```bash
git add src/data/aggregate.ts src/data/aggregate.test.ts
git commit -m "feat(data): fall back to price symbol / short mint for unnamed tokens"
```

---

## Task 11: usePortfolio pairs wallets with same-family chains only

**Files:**
- Modify: `src/state/usePortfolio.ts`
- Test: `src/state/usePortfolio.test.tsx` (extend)

- [ ] **Step 1: Add a failing test to `src/state/usePortfolio.test.tsx`** — add this `it` inside the existing `describe('usePortfolio', ...)` block:

```ts
  it('does not query an EVM wallet on Solana (family-matched pairing)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/token-balances')) {
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('coins.llama.fi')) {
        return { ok: true, json: async () => ({ coins: {} }) } as Response;
      }
      return { ok: true, json: async () => ({ coin_balance: '0' }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const wallets = [{ address: '0x' + 'a'.repeat(40), label: 'Main', family: 'evm' as const }];
    const { result } = renderHook(() => usePortfolio(wallets, ['ethereum', 'solana']), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // No RPC POST to a Solana endpoint should have happened.
    const calledSolana = fetchMock.mock.calls.some(([u]) => String(u).includes('solana-rpc'));
    expect(calledSolana).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/usePortfolio.test.tsx`
Expected: FAIL (current cartesian pairing queries the EVM wallet on Solana too).

- [ ] **Step 3: Update `src/state/usePortfolio.ts`** — replace the `loadPortfolio` pairing line. Change:

```ts
  const pairs = wallets.flatMap((w) => chains.map((c) => ({ address: w.address, chain: c })));
```

to:

```ts
  const pairs = wallets.flatMap((w) =>
    chains.filter((c) => getChain(c).family === w.family).map((c) => ({ address: w.address, chain: c })),
  );
```

And add the import at the top:

```ts
import { getChain } from '../config/chains';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/usePortfolio.test.tsx`
Expected: PASS (existing test + the new family-pairing test). Then run `npm test` and `npm run build` to confirm the whole suite and the TypeScript build are green.

- [ ] **Step 5: Commit**

```bash
git add src/state/usePortfolio.ts src/state/usePortfolio.test.tsx
git commit -m "feat(state): pair wallets only with enabled chains of the same family"
```

---

## Task 12: e2e — add a Solana wallet renders a SOL holding

**Files:**
- Create: `tests/e2e/solana.spec.ts`

- [ ] **Step 1: Create `tests/e2e/solana.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('add a Solana address and see a SOL holding', async ({ page }) => {
  // Mock the Solana RPC (POST) and DefiLlama price.
  await page.route('**/solana-rpc.publicnode.com/**', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (body.method === 'getBalance') {
      await route.fulfill({ json: { jsonrpc: '2.0', id: 1, result: { value: 2000000000 } } });
    } else {
      await route.fulfill({ json: { jsonrpc: '2.0', id: 1, result: { value: [] } } });
    }
  });
  await page.route('**/coins.llama.fi/**', (route) =>
    route.fulfill({ json: { coins: { 'coingecko:solana': { price: 150, symbol: 'SOL' } } } }),
  );

  await page.goto('/');
  await page.getByPlaceholder(/wallet address/i).fill('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs');
  await page.getByRole('button', { name: /add/i }).click();

  await expect(page.getByText('SOL').first()).toBeVisible();
  await expect(page.getByText('$300', { exact: false })).toBeVisible(); // 2 SOL * $150
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run e2e`
Expected: both e2e specs (Phase 1 `dashboard.spec.ts` + this one) PASS. If the Solana holding doesn't appear, debug the route glob or selectors — do not weaken assertions.

- [ ] **Step 3: Run the full unit suite and build once more**

Run: `npm test && npm run build`
Expected: all unit tests PASS, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/solana.spec.ts
git commit -m "test(e2e): adding a Solana address renders a SOL holding (mocked)"
```

---

## Notes on scope

Phase 2 is Solana (SOL + SPL) and Bitcoin (BTC) only. Bitcoin ordinals/runes/BRC-20, Solana
staking/NFTs, transaction history, P&L, and CEX read-only keys (Phase 3) are out of scope and
must not be added here.

**Known limitation (documented):** a Bitcoin *legacy* address (`1…`/`3…`) longer than 33
characters, or a Solana address ≤33 chars starting with `1`/`3`, sits in an ambiguous base58
range. Detection favors Bitcoin-legacy for `[13]`-prefixed strings up to 33 chars and Solana
for 32–44; real-world addresses almost never collide (Solana addresses are 43–44 chars, legacy
BTC ≤34), and modern BTC uses unambiguous bech32 (`bc1…`).
