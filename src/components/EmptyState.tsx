import { useState } from 'react';
import { isValidAddress } from '../data/walletStore';
import { looksLikeEnsName, resolveEns } from '../data/ensProvider';
import { PrivacyNote } from './primitives';

export function EmptyState({ onAdd }: { onAdd: (address: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = value.trim();
    if (isValidAddress(v)) {
      setError('');
      onAdd(v);
      setValue('');
      return;
    }
    if (looksLikeEnsName(v)) {
      setBusy(true);
      setError('');
      const r = await resolveEns(v);
      setBusy(false);
      if (r) {
        onAdd(r.address);
        setValue('');
        return;
      }
      setError(`Couldn't resolve ${v}. Check the name or paste an address.`);
      return;
    }
    setError("That doesn't look like a valid address. Paste an EVM (0x…), Solana or Bitcoin address, or an ENS name.");
  };

  return (
    <div className="max-w-md mx-auto text-center mt-24">
      <div className="text-2xl font-extrabold text-white mb-1">◈ Coldview</div>
      <div className="text-muted text-sm mb-6">A private, read-only crypto portfolio. Paste a wallet address to begin.</div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-text outline-none focus:border-neon"
          placeholder="Address or ENS name (e.g. vitalik.eth)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="px-4 py-2 rounded-lg bg-neon/10 border border-neon text-neon" onClick={submit} disabled={busy}>
          {busy ? 'Resolving…' : 'Add'}
        </button>
      </div>
      {error && <div className="text-danger text-xs mt-2">{error}</div>}
      <PrivacyNote />
    </div>
  );
}
