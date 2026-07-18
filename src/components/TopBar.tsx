import { WalletManager } from './WalletManager';
import { ApiKeyControl } from './ApiKeyControl';
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
}

export function TopBar({ wallets, onAdd, onRemove, apiKey, onApiKey, view, onView }: Props) {
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
        <div className="flex gap-1">{tab('portfolio', 'Portfolio')}{tab('activity', 'Activity')}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <WalletManager wallets={wallets} onAdd={onAdd} onRemove={onRemove} />
        <ApiKeyControl value={apiKey} onChange={onApiKey} />
      </div>
    </div>
  );
}
