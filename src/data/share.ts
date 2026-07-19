import { detectFamily } from './family';
import type { ChainId } from './types';
import type { Wallet } from './walletStore';

export interface SharePayload {
  wallets: Wallet[];
  chains: ChainId[];
}

function b64urlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)));
}

// A share link carries only wallet addresses + labels + which chains are on.
// No balances or keys — the recipient's app fetches live, read-only.
export function encodeShare(wallets: Wallet[], chains: ChainId[]): string {
  const payload = { w: wallets.map((x) => ({ a: x.address, l: x.label })), c: chains };
  return b64urlEncode(JSON.stringify(payload));
}

export function decodeShare(str: string): SharePayload | null {
  try {
    const p = JSON.parse(b64urlDecode(str)) as { w?: { a?: string; l?: string }[]; c?: ChainId[] };
    if (!Array.isArray(p.w) || !Array.isArray(p.c)) return null;
    const wallets: Wallet[] = [];
    for (const x of p.w) {
      if (typeof x.a !== 'string') continue;
      const family = detectFamily(x.a);
      if (!family) continue;
      wallets.push({ address: x.a, label: typeof x.l === 'string' ? x.l : 'Wallet', family });
    }
    if (wallets.length === 0) return null;
    return { wallets, chains: p.c };
  } catch {
    return null;
  }
}

// Builds a full shareable URL for the current portfolio.
export function buildShareUrl(wallets: Wallet[], chains: ChainId[]): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#share=${encodeShare(wallets, chains)}`;
}

// Reads a shared portfolio from the current URL (hash first, then query), if any.
export function readSharedView(): SharePayload | null {
  const src = `${window.location.hash} ${window.location.search}`;
  const m = /[#&?]share=([A-Za-z0-9\-_]+)/.exec(src);
  return m ? decodeShare(m[1]) : null;
}
