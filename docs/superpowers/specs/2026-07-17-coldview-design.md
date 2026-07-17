# Coldview — Design (Phase 1 MVP)

**Date:** 2026-07-17
**Status:** Approved for planning
**Author:** 090TYPE (Nikita Shchelyagin)

---

## 1. What it is

Coldview is a **private, read-only crypto portfolio dashboard**. You paste one or more
public wallet addresses and see a single beautiful picture of what you hold: total value,
allocation, per-token breakdown, and how your portfolio value has moved over time.

**The differentiator:** everything runs in the browser. Addresses and history are stored
locally and never touch a server. No accounts, no sign-up, no custody, no API keys of ours
to leak. This is the honest "your data stays on your device" angle that DeBank / Zerion
can't claim.

**Working name:** Coldview (read-only / cold-wallet view).

### Vision and phasing

The full vision is a unified view across EVM, Solana, Bitcoin, and read-only CEX API keys.
That is several independent systems and is built in phases. **This spec covers Phase 1 only.**

- **Phase 1 (this spec):** EVM wallets — Ethereum + L2s. Client-only.
- **Phase 2 (future):** Solana + Bitcoin (same read-only-address pattern).
- **Phase 3 (future):** CEX read-only API keys. Requires a backend for key security — a
  deliberate architectural break from the client-only model, so it comes last.

---

## 2. Target user and value

Crypto holders whose assets are spread across several EVM wallets and chains and who lack a
single, private, trustworthy overview. They are comfortable pasting an address; many already
have a free Alchemy key.

**Core promise for Phase 1:** paste address(es) → in seconds, a clean aggregated snapshot of
holdings, allocation, and 24h movement, with a value-over-time chart that grows as you use it.

---

## 3. Privacy & architecture model

**Client-only static web app. No backend. No server ever sees or stores an address.**

Consequences that shape the whole design:

- **Data sources must be keyless and CORS-enabled** (callable directly from the browser).
  - **Token balances:** Blockscout-family explorer APIs (one instance per chain), endpoint
    `GET /api/v2/addresses/{address}/token-balances` plus the native-coin balance. Keyless,
    CORS-friendly.
  - **Prices & 24h change:** DefiLlama `coins.llama.fi` (keyed by `chain:contract`, keyless,
    CORS) with CoinGecko as a fallback for native coins / gaps.
- **Optional BYOK "power mode":** the user may paste their **own** free Alchemy key. It is
  stored only in their browser (localStorage) and used for faster/richer balance enumeration.
  Their key, their browser, their rate limit. Never transmitted anywhere except Alchemy.
- **Wallet list** (addresses + labels) lives in **localStorage**.
- **Portfolio value history** lives in **IndexedDB** — see §5, the chart is self-accumulated.

**Deployment:** static build → GitHub Pages or Vercel. Zero secrets in the bundle.

---

## 4. Features (Phase 1 scope)

**Core (must-have):**
- Add / label / remove multiple wallet addresses; aggregate across all of them.
- Chain filter: All / Ethereum / Arbitrum / Base / Polygon / Optimism.
- Total balance in USD across selected wallets & chains, with 24h and 30d change.
- Allocation: by token (ring) and by chain (bar).
- Holdings table: asset · chain · balance · price · value · 24h.
- Privacy note; optional BYOK key control.

**Stretch (included if cheap):**
- Portfolio value-over-time chart, built from **self-accumulated snapshots** (§5).

**Explicitly out of scope for Phase 1:** P&L / cost basis, transaction history feed,
Solana / Bitcoin, CEX keys, accounts / cross-device sync, NFTs, DeFi positions (LP / staking /
lending). These are later phases and must not creep into Phase 1.

---

## 5. The value-over-time chart (honest design)

Historical balances cannot be reconstructed keyless. Instead the chart is **privacy-native**:
on each successful load, the app records `{ timestamp, totalValueUsd }` to IndexedDB (throttled
to at most once per hour) and draws the series. The curve starts empty and grows as the user
returns. This is stated in the UI so it is never mistaken for backfilled history.

---

## 6. Tech stack

React 19 + TypeScript + Vite + Tailwind. Charts: Recharts. Client state: Zustand.
Data fetching/caching: TanStack Query (dedupe, retry with backoff, staleTime). Storage:
`localStorage` (wallets, BYOK key) and IndexedDB (value snapshots). All static; no server.

---

## 7. Component / module breakdown

Designed as small, independently testable units with clear interfaces.

### Data layer (framework-agnostic, pure where possible)

- **`chainRegistry`** — static config per supported chain: `id`, `name`, `nativeSymbol`,
  `blockscoutBaseUrl`, `color`. Single source of truth for which chains exist.
- **`BalanceProvider`** (interface) → `getBalances(address, chain): Promise<TokenBalance[]>`.
  - `BlockscoutBalanceProvider` (default, keyless).
  - `AlchemyBalanceProvider` (used only when a BYOK key is present).
  - Output normalized to `TokenBalance { chainId, contract|null, symbol, decimals, rawBalance }`
    (native coin = `contract: null`).
- **`PriceProvider`** (interface) → `getPrices(keys: TokenKey[]): Promise<Record<TokenKey, Price>>`
  where `Price { usd, change24hPct }`. `DefiLlamaPriceProvider` default, CoinGecko fallback.
- **`aggregatePortfolio`** — **pure function**: `(balances, prices, filters) → PortfolioSnapshot`.
  Merges balances across wallets×chains, attaches prices, computes per-token value, total,
  allocation by token, allocation by chain, weighted 24h change. Filters spam / zero-value tokens.
  No I/O — the heavily-tested core.
- **`snapshotStore`** (IndexedDB) — `append(totalValueUsd)` (throttled ≤1/h) and
  `getSeries(period): Point[]`.
- **`walletStore`** (localStorage) — CRUD for `{ address, label }[]` and the BYOK key.

### State + data hooks

- Zustand store: `wallets`, `enabledChains`, `period`, `byokKey`.
- TanStack Query hooks: `useBalances(wallet, chain)`, `usePrices(keys)`, and a derived
  `usePortfolio()` that runs `aggregatePortfolio` over cached results.

### UI components

`TopBar` → `WalletManager`, `ApiKeyControl`; `ChainFilter`; `HeroPanel` → `TotalBalance`,
`PeriodToggle`, `ValueChart`; `AllocationPanel` → `AllocationRing`, `ByChainBar`;
`HoldingsTable`; `PrivacyNote`; plus `EmptyState`, `ErrorBanner`, `LoadingSkeleton`.

Each UI unit renders from props/store and holds no fetching logic of its own.

---

## 8. Data flow

1. Load `wallets` from localStorage. If empty → `EmptyState` onboarding ("add a wallet").
2. For each `wallet × enabledChain`, `useBalances` calls the active `BalanceProvider`
   (Alchemy if BYOK present, else Blockscout).
3. Collect unique token keys → `usePrices` batches a `PriceProvider` call.
4. `aggregatePortfolio` produces the `PortfolioSnapshot`.
5. `snapshotStore.append(total)` (throttled) records the point for `ValueChart`.
6. Components render from the snapshot.

---

## 9. Error handling

- **Per-chain isolation:** each chain's fetch is independent. If Polygon's API fails, the rest
  of the dashboard still renders; a small inline note reports the degraded chain.
- **Rate limits:** aggressive caching (`staleTime` ≈ 60s), request staggering, TanStack Query
  retry-with-backoff. BYOK mode lifts limits.
- **No price / unknown token:** show the balance, value `—`, exclude from total; never crash.
- **Spam tokens:** filter airdrop spam (Blockscout spam flags + a zero-USD / heuristic filter)
  so the table stays clean.
- **Invalid / empty address:** validate on input; friendly message; never a blank crash.
- **Offline / all sources down:** render the last cached snapshot with a stale indicator.

---

## 10. Testing

- **Unit (core):** `aggregatePortfolio` — allocation math, weighted 24h change, multi-wallet
  dedupe, spam/zero filtering; `chainRegistry`; `snapshotStore` throttling.
- **Provider adapters:** feed fixture JSON (captured Blockscout / DefiLlama responses) → assert
  normalized output.
- **Components:** React Testing Library for `HoldingsTable`, `EmptyState`, `ErrorBanner`,
  `AllocationRing`.
- **E2E (light):** Playwright — add an address (mocked network or a known public address) →
  dashboard renders total + holdings.

---

## 11. Visual design

**Terminal Pro:** near-black background (`#070a0e`) with a subtle grid, panels `#0b1218` /
border `#16212b`, monospace numerics (Fira Code), neon green `#22e6a4` (positive), blue
`#3aa0ff`, amber `#ffb020`, red `#ff5c72` (negative). Uppercase micro-labels.

**Layout (validated):** top bar (wallets + BYOK) → chain filter → hero (total + 24h/30d +
period toggle + value chart, left) & allocation (ring + by-chain, right) → holdings table →
privacy note. Responsive: columns stack on mobile.

---

## 12. Deployment

Static Vite build published to GitHub Pages (or Vercel). No environment secrets. The only
user secret (optional BYOK key) never leaves the browser.
