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
