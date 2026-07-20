# ERC-20 Token Approvals (in-app) — Design

**Date:** 2026-07-20
**Status:** Approved (design), pending implementation plan

## Goal

Show a wallet's active ERC-20 token approvals directly inside Coldview instead of
only deep-linking to revoke.cash. Reinforces the app's core identity — *private,
read-only, keyless* — by surfacing a real security signal ("who can move your
tokens") from the same public data sources already in use.

## Decisions (locked)

| Question | Decision |
|---|---|
| Data source / accuracy | **A** — Blockscout logs only (keyless). Use the last `Approval` event value per (token, spender). No `eth_call` verification. |
| Approval types | **A** — ERC-20 `Approval(owner, spender, value)` only. No NFT `ApprovalForAll`. |
| Placement | **B** — a section inside the existing P&L view (`PnlView.tsx`), not a new tab. |

## Scope

**In scope:** EVM chains only; ERC-20 approvals only; read-only display; per-row
deep-link out to revoke.cash for the actual revoke action.

**Out of scope (deferred, YAGNI):** NFT `ApprovalForAll` operators; `eth_call`
allowance verification; in-app revoking; Solana/Bitcoin (no approval concept).

## Architecture

Follows existing patterns: pure provider + pure parser in `src/data`, a TanStack
Query hook in `src/state`, rendering inside an existing view component.

### 1. Data layer — `src/data/approvalsProvider.ts`

Mirrors `gasProvider.ts` (network fetch separate from a pure, testable parser).

- **Constants:** `APPROVAL_TOPIC0` = keccak256 of `Approval(address,address,uint256)`
  (`0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925`);
  helper to left-pad the owner address to a 32-byte topic.
- **`fetchApprovalLogs(address, chainId, maxPages)`** — fetches the owner's
  `Approval` logs from the chain's Blockscout instance using a topic filter
  (topic0 = Approval signature, topic1 = padded owner address), paginated.
  Exact Blockscout endpoint/params to be validated against a live instance
  during TDD (candidate: Etherscan-compatible `?module=logs&action=getLogs`
  with `topic0`/`topic1` + `topic0_1_opr=and`, else the v2 logs route). On a
  missing/unsupported endpoint or network error, resolve empty (graceful skip).
- **`parseApprovals(rawLogs, owner)`** — **pure, unit-tested**:
  - Groups events by `(tokenAddress, spender)`.
  - Keeps only the **latest** event per group (by block number / log index).
  - Drops groups whose latest `value === 0` (already revoked → no active allowance).
  - Flags `value === 2**256 - 1` (and other >uint128 sentinels) as **unlimited**
    (`amount: null`).
  - Skips malformed logs.

**Type:**
```ts
interface TokenApproval {
  chainId: ChainId;
  tokenAddress: string;   // ERC-20 contract (log emitter)
  spender: string;        // approved spender (topic2)
  amount: bigint | null;  // null = unlimited
  txHash: string;
  blockTime?: string;     // if provided by the log payload
}
```

### 2. Hook — `src/state/useApprovals.ts`

Mirrors `useGas.ts`:
- Signature: `useApprovals(wallets: Wallet[], chains: ChainId[], enabled: boolean)`.
- Builds owner×chain pairs filtered to EVM family (`getChain(c).family === 'evm'`
  and `w.family === 'evm'`).
- `Promise.allSettled` across pairs; fulfilled results merged into one flat
  `TokenApproval[]`; rejected pairs skipped silently (same policy as gas).
- `queryKey: ['approvals', sortedAddresses, sortedChains]`, `staleTime: 5 * 60_000`,
  `retry: 1`, `enabled: enabled && wallets.length > 0`.

### 3. UI — section inside `PnlView.tsx`

Rendered below the existing P&L table. May be extracted to
`components/ApprovalsSection.tsx` if `PnlView.tsx` grows unwieldy.

- Consumes `useApprovals(wallets, enabledChains, true)`.
- Enriches each row with token `symbol`/`decimals` by matching `tokenAddress`
  against the `holdings` already passed into `PnlView`; unknown tokens show a
  shortened contract address as the label and a raw/unformatted amount.
- Table columns: **Asset | Spender | Allowance | Chain | ↗**
  - **Allowance:** formatted by decimals when known; `Unlimited` shown as a red
    badge. Unlimited rows sort to the top (highest risk first).
  - **Spender:** shortened address (contract name if the log payload provides one).
  - **↗:** per-row link to `https://revoke.cash/address/{owner}` on the relevant
    chain — revoke happens off-app (keeps Coldview read-only).
- Loading: `LoadingSkeleton` within the section.
- Empty: "No active token approvals found."
- Honesty note: "Shows the last approved limit from on-chain logs — the actual
  remaining allowance may be lower."

## Data flow

`PnlView` already receives `wallets`, `enabledChains`, `holdings`.
→ `useApprovals(wallets, enabledChains, true)` fetches per pair via Blockscout.
→ `parseApprovals` reduces raw logs to active approvals.
→ Section renders the merged list, enriched from `holdings`, sorted unlimited-first.

## Error handling

- Per-pair failures are swallowed by `Promise.allSettled` (consistent with `useGas`).
- Chains whose Blockscout instance lacks the logs endpoint resolve empty and are
  simply absent from the list — no error surfaced to the user.
- If every pair fails, the section shows the empty state.

## Testing

- `approvalsProvider.test.ts` (pure `parseApprovals`):
  - dedupe to latest event per (token, spender);
  - unlimited detection (`2**256-1` and large sentinels);
  - zero-value latest → filtered out;
  - multiple spenders on one token retained separately;
  - malformed / missing-topic logs skipped.
- Amount-formatting tests (decimals known vs unknown; unlimited).
- Co-located `*.test.ts`, matching existing convention (Vitest).

## Non-goals / caveats

- Last-approved-value can overstate the true remaining allowance; surfaced in the
  UI note. `eth_call` verification is a possible future enhancement (option B).
- NFT `ApprovalForAll` operator approvals are a separate future addition.
