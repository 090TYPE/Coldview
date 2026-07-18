# Coldview — Phase 2 Design (Solana + Bitcoin)

**Date:** 2026-07-18
**Status:** Approved for planning
**Author:** 090TYPE (Nikita Shchelyagin)
**Builds on:** Phase 1 (EVM wallets) — see `2026-07-17-coldview-design.md`.

---

## 1. What this adds

Phase 2 extends Coldview beyond EVM to two more networks, keeping the client-only,
keyless, privacy-first model unchanged:

- **Solana** — native SOL plus SPL tokens.
- **Bitcoin** — native BTC only.

A user pastes a Solana or Bitcoin address (alongside their EVM addresses) and the same
dashboard aggregates everything into one picture. Nothing about the architecture changes:
still a static client-only app, still keyless CORS data sources, still addresses-never-leave-
the-browser.

---

## 2. Approach: generalize in place

The Phase 1 code is EVM-centric in three spots (address validation, the chain registry's
Blockscout URL, and the balance provider). We generalize those in place rather than adding a
parallel non-EVM subsystem or a formal adapter framework (overkill for three families):

- `ChainInfo` gains a `family: 'evm' | 'solana' | 'bitcoin'` and family-specific endpoint config.
- `fetchBalances(address, chain)` becomes a dispatcher on `chain.family` → `fetchEvmBalances`
  (existing Blockscout code, unchanged), `fetchSolanaBalances`, `fetchBitcoinBalance`.
- A `Wallet` gains a `family`, detected from its address format when added, so it is only
  queried on compatible chains.

`aggregatePortfolio`, the snapshot store, the allocation ring, the holdings table, and the
value chart are already chain-agnostic and do not change.

---

## 3. Types and chain registry

- `ChainId` union adds `'solana'` and `'bitcoin'`.
- `ChainInfo` adds `family`. For Solana/Bitcoin the Blockscout URL is replaced by the relevant
  endpoint (`rpcUrl` for Solana, `esploraBaseUrl` for Bitcoin). EVM chains keep `blockscoutBaseUrl`.
- `TokenBalance` is unchanged:
  - Bitcoin: `{ chainId:'bitcoin', contract:null, symbol:'BTC', decimals:8 }`.
  - Solana native: `{ chainId:'solana', contract:null, symbol:'SOL', decimals:9 }`.
  - SPL token: `{ chainId:'solana', contract:<mint>, decimals:<from RPC> }`.

---

## 4. Address detection and the wallet model

- `detectFamily(address): Family | null`
  - EVM: `/^0x[0-9a-fA-F]{40}$/`.
  - Solana: base58, length 32–44, not starting with `0x`.
  - Bitcoin: `bc1…` (bech32) or legacy `1…` / `3…` base58 patterns.
- `isValidAddress(address)` = `detectFamily(address) !== null`.
- `Wallet` becomes `{ address: string; label: string; family: Family }`. `family` is computed
  from `detectFamily` at add time. A stored EVM wallet is queried across the enabled EVM chains;
  a Solana wallet only on Solana; a Bitcoin wallet only on Bitcoin.
- **Migration:** existing stored wallets (Phase 1) have no `family`. On load, backfill it via
  `detectFamily(address)` so old localStorage data keeps working without a reset.

---

## 5. Balance providers (keyless + CORS)

- **Solana** (`fetchSolanaBalances`): JSON-RPC POST to a keyless public endpoint
  (`https://solana-rpc.publicnode.com`).
  - `getBalance` → SOL (lamports, 9 decimals).
  - `getTokenAccountsByOwner` with `encoding: 'jsonParsed'` → SPL tokens; each parsed account
    yields `mint`, `tokenAmount.amount` (raw) and `tokenAmount.decimals`. Zero-balance accounts
    are skipped.
  - SPL symbol is not in the RPC response; it is filled from the DefiLlama price response
    (§6), falling back to a truncated mint if absent.
- **Bitcoin** (`fetchBitcoinBalance`): `GET https://blockstream.info/api/address/{addr}`
  (esplora). Balance in sats = `chain_stats.funded_txo_sum − chain_stats.spent_txo_sum`
  (add the mempool deltas too). One native `TokenBalance`, decimals 8.
- **EVM** (`fetchEvmBalances`): unchanged Blockscout code, extracted from the current
  `fetchBalances` body.

`fetchBalances(address, chain)` dispatches on `chain.family`.

---

## 6. Prices and symbols

`defiLlamaKeys` extends the native map: `SOL → coingecko:solana`, `BTC → coingecko:bitcoin`.
SPL tokens map to `solana:<mint>`. The DefiLlama `coins.llama.fi/prices/current/` response
includes a `symbol` field per coin, which is used to name SPL tokens (fallback: truncated
mint). Bitcoin has no tokens. No separate token list is needed.

---

## 7. Data flow

`usePortfolio(wallets, enabledChains)` builds pairs of each wallet with only the enabled chains
whose `family` matches the wallet's `family`, then proceeds exactly as in Phase 1:
`fetchBalances` per pair (isolated via `Promise.allSettled`) → collect balances →
`fetchPrices` (try/catch degrade) → `aggregatePortfolio` (unchanged) → snapshot append.

---

## 8. UI

- `ChainFilter` lists Solana and Bitcoin chips alongside the EVM chains, all toggleable.
- `EmptyState` and `WalletManager` accept non-EVM addresses through the generalized
  `isValidAddress`; the shortened-address display works for any format.
- Everything else (hero, allocation, holdings table, value chart, privacy note) is unchanged —
  chains simply appear as more rows and more allocation slices.

---

## 9. Error handling

Same posture as Phase 1: per-chain isolation via `Promise.allSettled`, price-fetch failure
degrades to an empty price map, dust/priceless filter keeps the table clean. Public Solana RPC
is rate-limited, so caching stays aggressive (`staleTime` 60 s) and Solana requests are not
fanned out per-chain (a Solana wallet hits Solana once).

---

## 10. Testing

- **Unit:** `detectFamily` / `isValidAddress` for EVM / Solana / Bitcoin / garbage; the wallet
  `family` backfill migration; Solana RPC parser and esplora parser (fixture JSON → normalized
  `TokenBalance[]`); `defiLlamaKeys` covering SOL / BTC natives and an SPL mint; the
  wallet×compatible-chain pairing in `usePortfolio`.
- **Component:** `ChainFilter` renders and toggles Solana/Bitcoin; `WalletManager`/`EmptyState`
  accept a Solana address.
- **E2E (light):** add a Solana address (mocked RPC + price) → a SOL holding renders.

---

## 11. Out of scope for Phase 2

Bitcoin ordinals / runes / BRC-20; Solana staking accounts and NFTs; transaction history; P&L /
cost basis; CEX read-only keys (Phase 3, which requires a backend and is a deliberate break from
the client-only model). None of these may creep into Phase 2.
