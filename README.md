<div align="center">

# ◈ Coldview

**A private, read-only crypto portfolio dashboard that runs entirely in your browser.**

Paste a wallet address — or an ENS name — and get one clean picture of your holdings across
11 chains. No sign-up, no API keys, no server. Your addresses never leave your device.

[![Live demo](https://img.shields.io/badge/▶_Live_demo-090type.github.io%2FColdview-22e6a4?style=for-the-badge)](https://090type.github.io/Coldview/)

[![CI](https://github.com/090TYPE/Coldview/actions/workflows/ci.yml/badge.svg)](https://github.com/090TYPE/Coldview/actions/workflows/ci.yml)
[![Deploy](https://github.com/090TYPE/Coldview/actions/workflows/deploy.yml/badge.svg)](https://github.com/090TYPE/Coldview/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 🌐 Try it now

**→ [090type.github.io/Coldview](https://090type.github.io/Coldview/)**

No account, no wallet connection, no signatures. Just paste a public address (e.g. `vitalik.eth`)
and explore. Nothing you enter is sent anywhere — see [Privacy](#-privacy) below.

## Why it's different

- 🔒 **Fully client-side.** Addresses and history live in *your* browser (localStorage +
  IndexedDB). No accounts, no backend, nothing to leak.
- 🔑 **Keyless & read-only.** Works out of the box on public data. It never asks you to connect
  a wallet or sign anything — it only *reads*.
- ⚡ **Installable & offline.** It's a PWA: install it like an app, and your last view still loads
  with no connection.

## What it does

| | Feature |
|---|---|
| 📊 | **Portfolio** — total value, allocation ring, value-over-time chart, 24h change |
| 🏷 | **ENS** — add a wallet by name (`vitalik.eth`); name + avatar shown on the chip |
| 🖼 | **NFT gallery** — your ERC-721 / ERC-1155 across chains |
| 🔁 | **Activity** — transfer history with USD-at-the-time and **swap / send / receive** labels |
| 💰 | **Cost-basis P&L** — FIFO realized & unrealized, honest about partial history |
| 🧾 | **Tax report** — one-click capital-gains CSV (Form 8949 style) |
| ⛽ | **Gas paid** — total fees you've spent |
| 🔔 | **Price alerts** — browser notifications while the app is open |
| 🛡 | **Approvals** — jump to revoke.cash to review token allowances |
| 📈 | **7-day sparklines**, 🪙 token logos everywhere, 🧹 hide spam tokens |
| 💱 | **Any currency** — display in USD, EUR, GBP, JPY, RUB and more |
| 🔗 | **Share** — a read-only link to a portfolio (addresses only, no keys) |
| ⬇️ | **CSV export**, sort, hide-dust, multi-wallet |

### Chains

Ethereum · Arbitrum · Base · Polygon · Optimism · zkSync Era · Scroll · Gnosis · Celo ·
**Solana** · **Bitcoin**

## 🔐 Privacy

Coldview has no server. It makes read-only calls straight from your browser to public block
explorers and price APIs to display balances:

- **Balances & history** — [Blockscout](https://blockscout.com) (EVM), public Solana RPC, and
  [Blockstream esplora](https://blockstream.info) (Bitcoin)
- **Prices** — [DefiLlama](https://defillama.com); **FX rates** — open.er-api.com;
  **ENS** — ensideas

Your wallet addresses are **never** transmitted to any Coldview-operated server (there isn't
one). Wallets, alerts, hidden tokens and your currency choice are stored only in your browser.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · Zustand · TanStack Query · Recharts ·
idb-keyval · vite-plugin-pwa. Tested with Vitest + Testing Library and Playwright
(141 unit + 5 end-to-end tests).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (Vitest)
npm run e2e      # end-to-end (Playwright)
npm run build    # static production build -> dist/
```

The production build is a fully static bundle — host `dist/` anywhere. This repo auto-deploys it
to GitHub Pages on every push to `master` (see `.github/workflows/deploy.yml`).

## License

[MIT](LICENSE) © 090TYPE
