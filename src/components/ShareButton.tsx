import { useState } from 'react';
import { buildShareUrl } from '../data/share';
import type { ChainId } from '../data/types';
import type { Wallet } from '../data/walletStore';

// Copies a read-only share link for the current portfolio to the clipboard.
// The link encodes only the wallet addresses + active chains — no keys, no balances.
export function ShareButton({ wallets, chains }: { wallets: Wallet[]; chains: ChainId[] }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(wallets, chains));
    } catch {
      /* clipboard unavailable — nothing else we can do client-side */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={share}
      title="Copy a read-only link to this portfolio (the link reveals the wallet addresses)"
      className="text-[12px] px-3 py-1 rounded-full border border-border text-[#9fb0bd] hover:border-neon hover:text-neon"
    >
      {copied ? '✓ Link copied' : '↗ Share'}
    </button>
  );
}
