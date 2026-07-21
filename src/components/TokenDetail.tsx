import { useEffect } from 'react';
import { getChain } from '../config/chains';
import { Sparkline } from './Sparkline';
import { useMoney } from '../state/useMoney';
import type { ChainId, Holding } from '../data/types';

export interface QuickLink {
  label: string;
  url: string;
}

// External links relevant to a single token: block explorer + a market page.
export function tokenLinks(chainId: ChainId, contract: string | null): QuickLink[] {
  const chain = getChain(chainId);
  const links: QuickLink[] = [];
  if (chain.blockscoutBaseUrl) {
    links.push({ label: 'Explorer', url: contract ? `${chain.blockscoutBaseUrl}/token/${contract}` : chain.blockscoutBaseUrl });
  } else if (chainId === 'solana') {
    links.push({ label: 'Explorer', url: contract ? `https://solscan.io/token/${contract}` : 'https://solscan.io' });
  } else if (chainId === 'bitcoin') {
    links.push({ label: 'Explorer', url: 'https://blockstream.info' });
  }
  if (contract) {
    links.push({ label: 'Dexscreener', url: `https://dexscreener.com/search?q=${contract}` });
  }
  return links;
}

interface Props {
  holding: Holding;
  sparkline?: number[];
  onClose: () => void;
}

export function TokenDetail({ holding, sparkline, onClose }: Props) {
  const money = useMoney();
  const contract = holding.key.split(':')[1] === 'native' ? null : holding.key.split(':').slice(1).join(':');
  const links = tokenLinks(holding.chainId, contract);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-panel border border-border rounded-[12px] p-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${holding.symbol} details`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#e6eef3] text-lg">{holding.symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted">{getChain(holding.chainId).name}</span>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-muted hover:text-neon text-lg leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-[12.5px] mb-3">
          <span className="text-muted">Balance</span>
          <span className="text-right">{holding.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
          <span className="text-muted">Price</span>
          <span className="text-right">{money(holding.priceUsd)}</span>
          <span className="text-muted">Value</span>
          <span className="text-right font-bold text-[#e6eef3]">{money(holding.valueUsd)}</span>
        </div>

        <div className="mb-3 flex justify-center">
          <Sparkline data={sparkline} width={280} height={56} />
        </div>

        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] px-3 py-1 rounded-full border border-border text-blue hover:border-blue"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
