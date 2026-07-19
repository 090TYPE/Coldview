import { WalletManager } from './WalletManager';
import { ApiKeyControl } from './ApiKeyControl';
import { ShareButton } from './ShareButton';
import type { ChainId } from '../data/types';
import type { Wallet } from '../data/walletStore';
import type { View } from '../state/store';

interface Props {
  wallets: Wallet[];
  onAdd: (address: string, label: string) => void;
  onRemove: (address: string) => void;
  apiKey: string;
  onApiKey: (k: string) => void;
  view: View;
  onView: (v: View) => void;
  ensByAddress?: Record<string, { name: string | null; avatar: string | null }>;
  chains?: ChainId[];
  readOnly?: boolean;
  onExitShared?: () => void;
}

export function TopBar({ wallets, onAdd, onRemove, apiKey, onApiKey, view, onView, ensByAddress, chains, readOnly, onExitShared }: Props) {
  const tab = (v: View, label: string) => (
    <button
      onClick={() => onView(v)}
      className={`text-[12px] px-3 py-1 rounded-full border ${
        view === v ? 'border-neon text-neon bg-neon/10' : 'border-border text-[#9fb0bd]'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center justify-between mb-3.5 gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="font-extrabold text-[#eafff6] tracking-wide">◈ Coldview<span className="text-neon">.</span></div>
        <div className="flex gap-1">{tab('portfolio', 'Portfolio')}{tab('activity', 'Activity')}{tab('nfts', 'NFTs')}{tab('pnl', 'P&L')}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {readOnly ? (
          <>
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-blue text-blue">Shared · read-only</span>
            {onExitShared && (
              <button onClick={onExitShared} className="text-[12px] px-3 py-1 rounded-full border border-border text-[#9fb0bd] hover:border-neon hover:text-neon">
                Exit to my portfolio
              </button>
            )}
          </>
        ) : (
          <>
            <WalletManager wallets={wallets} onAdd={onAdd} onRemove={onRemove} ensByAddress={ensByAddress} />
            {chains && wallets.length > 0 && <ShareButton wallets={wallets} chains={chains} />}
            <ApiKeyControl value={apiKey} onChange={onApiKey} />
          </>
        )}
      </div>
    </div>
  );
}
