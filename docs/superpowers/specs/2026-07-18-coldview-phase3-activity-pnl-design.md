# Coldview — Phase 3 Design (Activity + approximate P&L)

**Date:** 2026-07-18
**Status:** Approved for planning
**Author:** 090TYPE (Nikita Shchelyagin)
**Builds on:** Phase 1 (EVM) + Phase 2 (Solana/Bitcoin). Client-only, keyless, no server.

---

## 1. What this adds and why (not CEX)

The original Phase 3 was CEX read-only keys. That is dropped: CEX REST APIs block browser CORS
for authenticated endpoints, so it would require a server that keys transit — which destroys
Coldview's entire promise (nothing leaves your browser). Instead Phase 3 delivers the feature
crypto users want most that stays 100% client-side and keyless:

- **Activity feed** — a reverse-chronological list of your on-chain transfers, each with its
  **USD value at the time it happened**.
- **Honest "invested vs now" summary** — per token and in total, `net invested = Σ(USD in) −
  Σ(USD out)` at historical prices, shown next to current value for an approximate gain. It is
  explicitly labelled **flow-based**, not a tax cost-basis.

Full FIFO cost-basis P&L, swap/DeFi classification, and CEX are out of scope (a wrong number in
a finance tool is worse than no number). This phase is the correct, low-risk increment and the
foundation a real P&L can be built on later.

**Scope: EVM chains only** this phase. Solana/Bitcoin history parsing is materially harder and is
a follow-up.

---

## 2. Scope guardrails

- **Recent activity, bounded.** Fetch the most recent page of transfers per wallet×EVM-chain
  (Blockscout default page, ~50 items). This bounds the number of historical-price lookups and
  avoids deep-history rate limits. The UI says "recent activity".
- **Self-transfers excluded from flows.** A transfer whose counterparty is another of the user's
  own tracked addresses is shown in the feed but excluded from the invested/flow math (moving
  your own funds is not a buy or sell).
- **Priceless transfers** (no historical price) appear in the feed with USD "—" and do not affect
  flows.

---

## 3. Data sources (keyless + CORS)

- **EVM transfers:**
  - ERC-20: Blockscout `GET /api/v2/addresses/{addr}/token-transfers` — items carry `token`
    (address, symbol, decimals), `total` (value), `from`, `to`, `timestamp`, `tx_hash`.
  - Native coin: Blockscout `GET /api/v2/addresses/{addr}/transactions` — `value`, `from`, `to`,
    `timestamp`, `hash`.
- **Historical prices:** DefiLlama `GET https://coins.llama.fi/prices/historical/{unixTs}/{keys}`
  (keyless, CORS). Keys are `${chain}:${contract}` for tokens and `coingecko:<id>` for natives
  (reuse the Phase-2 native map). Historical prices are immutable → cache each `(key, dayTs)`
  result **permanently in IndexedDB**, so repeated views cost no network.

---

## 4. Components / modules

### Data layer
- **`parseTransfers.ts`** — pure. `parseTokenTransfers(json, chainId, owner)` and
  `parseNativeTxs(json, chainId, owner)` → `Transfer[]`. A `Transfer` is
  `{ chainId, txHash, timestamp (unix s), direction: 'in'|'out', symbol, contract: string|null,
  decimals, rawAmount, counterparty }`. Direction is `to===owner ? 'in' : 'out'`.
- **`txProvider.ts`** — `fetchTransfers(address, chainId): Promise<Transfer[]>`: fetches both
  Blockscout endpoints, parses, merges, sorts by timestamp desc.
- **`historicalPrice.ts`** — `getHistoricalUsd(key, unixTs): Promise<number | null>` with a
  permanent IndexedDB cache keyed by `${key}@${dayTs}` (timestamp floored to the day); a batch
  helper `hydrateHistoricalUsd(transfers)` that de-dupes `(key, day)` pairs, fetches missing ones
  from DefiLlama, and returns a `Map`.
- **`activity.ts`** — pure. `buildActivity(transfers, usdByTransfer)` → `ActivityRow[]` (transfer +
  `usdAtTime: number | null`). `computeFlows(rows, ownedAddresses, currentValueByToken)` →
  `{ perToken: FlowRow[], totalInvested, totalCurrent, totalGain }`, excluding self-transfers.

### State
- **`useActivity(wallets, chains)`** — TanStack Query: fetch transfers for EVM wallet×chain pairs
  (family-matched, reuse Phase-2 pairing), hydrate historical prices, build activity rows.

### UI
- **View toggle** in `TopBar`: Portfolio ↔ Activity (Zustand `view` state).
- **`ActivityView`** = `FlowsSummary` (invested vs current, flow-based label) + `ActivityTable`
  (time, direction arrow, token, amount, USD@time, chain).
- Portfolio view is unchanged.

---

## 5. Data flow

`useActivity` → for each EVM wallet×enabled-EVM-chain, `fetchTransfers` (isolated via
`Promise.allSettled`) → merge → `hydrateHistoricalUsd` (IndexedDB cache + DefiLlama for misses) →
`buildActivity` → `computeFlows` (needs the set of the user's own addresses and the current
portfolio's value-by-token, which the Portfolio query already produces). Render.

---

## 6. Error handling

Same posture as before: per-wallet-chain isolation via `Promise.allSettled`; a failed
historical-price lookup yields `null` USD (row still shows, excluded from flows); DefiLlama/
Blockscout rate limits mitigated by the permanent historical cache and TanStack Query `staleTime`.
Empty history → a friendly "no recent activity" state.

---

## 7. Testing

- **Unit:** `parseTokenTransfers` / `parseNativeTxs` (fixtures → normalized `Transfer[]`, correct
  direction); `historicalPrice` cache (hit avoids fetch; day-flooring) with `fake-indexeddb`;
  `buildActivity` (attaches usdAtTime); `computeFlows` (net invested, self-transfer exclusion,
  priceless exclusion, gain math).
- **Component:** `ActivityTable` renders rows with direction + USD@time; `FlowsSummary` shows
  invested/current/gain and the flow-based disclaimer; `TopBar` view toggle switches views.
- **E2E (light):** add an EVM address (mocked Blockscout transfers + DefiLlama historical) →
  switch to Activity → a transfer row with a USD value renders.

---

## 8. Out of scope for Phase 3

Solana/Bitcoin transaction history; full FIFO/average tax cost-basis; swap/DeFi/bridge
classification; internal-contract-call value; NFT transfers; CEX. The flow summary is deliberately
an approximate "invested vs current," not tax accounting — the UI labels it as such.
