import { WalletManager } from './WalletManager';
import { ApiKeyControl } from './ApiKeyControl';
import type { Wallet } from '../data/walletStore';

interface Props {
  wallets: Wallet[];
  onAdd: (address: string, label: string) => void;
  onRemove: (address: string) => void;
  apiKey: string;
  onApiKey: (k: string) => void;
}

export function TopBar({ wallets, onAdd, onRemove, apiKey, onApiKey }: Props) {
  return (
    <div className="flex items-center justify-between mb-3.5 gap-4 flex-wrap">
      <div className="font-extrabold text-[#eafff6] tracking-wide">◈ Coldview<span className="text-neon">.</span></div>
      <div className="flex items-center gap-2 flex-wrap">
        <WalletManager wallets={wallets} onAdd={onAdd} onRemove={onRemove} />
        <ApiKeyControl value={apiKey} onChange={onApiKey} />
      </div>
    </div>
  );
}
