import { useState } from 'react';
import { isValidAddress } from '../data/walletStore';
import { PrivacyNote } from './primitives';

export function EmptyState({ onAdd }: { onAdd: (address: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!isValidAddress(value)) {
      setError('Enter a valid address (0x + 40 hex characters).');
      return;
    }
    setError('');
    onAdd(value.trim());
    setValue('');
  };

  return (
    <div className="max-w-md mx-auto text-center mt-24">
      <div className="text-2xl font-extrabold text-white mb-1">◈ Coldview</div>
      <div className="text-muted text-sm mb-6">A private, read-only crypto portfolio. Paste a wallet address to begin.</div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-text outline-none focus:border-neon"
          placeholder="0x… wallet address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="px-4 py-2 rounded-lg bg-neon/10 border border-neon text-neon" onClick={submit}>
          Add
        </button>
      </div>
      {error && <div className="text-danger text-xs mt-2">{error}</div>}
      <PrivacyNote />
    </div>
  );
}
