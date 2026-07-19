import { useState } from 'react';
import { isValidAddress, type Wallet } from '../data/walletStore';
import { looksLikeEnsName, resolveEns } from '../data/ensProvider';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

interface Props {
  wallets: Wallet[];
  onAdd: (address: string, label: string) => void;
  onRemove: (address: string) => void;
  ensByAddress?: Record<string, { name: string | null; avatar: string | null }>;
}

export function WalletManager({ wallets, onAdd, onRemove, ensByAddress }: Props) {
  const [adding, setAdding] = useState(false);
  const [addr, setAddr] = useState('');
  const [label, setLabel] = useState('');

  const submit = async () => {
    const a = addr.trim();
    if (isValidAddress(a)) {
      onAdd(a, label.trim() || 'Wallet');
      setAddr('');
      setLabel('');
      setAdding(false);
      return;
    }
    if (looksLikeEnsName(a)) {
      const r = await resolveEns(a);
      if (r) {
        onAdd(r.address, label.trim() || r.name || 'Wallet');
        setAddr('');
        setLabel('');
        setAdding(false);
      }
    }
  };

  return (
    <div className="flex gap-2 items-center flex-wrap text-[12px]">
      {wallets.map((w) => {
        const ens = ensByAddress?.[w.address.toLowerCase()];
        const display = ens?.name || w.label;
        return (
          <span key={w.address} className="border border-neon text-neon rounded-full px-2.5 py-1 flex items-center gap-2">
            {ens?.avatar && <img src={ens.avatar} alt="" className="w-3.5 h-3.5 rounded-full" />}
            {display} · {short(w.address)}
            <button aria-label={`remove ${w.label}`} className="text-muted hover:text-danger" onClick={() => onRemove(w.address)}>
              ×
            </button>
          </span>
        );
      })}
      {adding ? (
        <span className="flex gap-1">
          <input className="bg-panel border border-border rounded px-2 py-0.5 w-56 outline-none" placeholder="EVM / Solana / Bitcoin address" value={addr} onChange={(e) => setAddr(e.target.value)} />
          <input className="bg-panel border border-border rounded px-2 py-0.5 w-20 outline-none" placeholder="label" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <button className="text-neon" onClick={submit}>save</button>
        </span>
      ) : (
        <button className="text-blue border border-[#22384a] rounded-full px-2.5 py-1" onClick={() => setAdding(true)}>
          + add
        </button>
      )}
    </div>
  );
}
