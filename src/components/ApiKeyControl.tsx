import { useState } from 'react';

export function ApiKeyControl({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="text-[11px]">
      <button className="text-muted border border-border rounded-full px-2.5 py-1" onClick={() => setOpen((o) => !o)}>
        ⚙ {value ? 'own key ✓' : 'own API key'}
      </button>
      {open && (
        <input
          className="ml-2 bg-panel border border-border rounded px-2 py-0.5 w-64 outline-none"
          placeholder="Alchemy API key (used when available; stored only in this browser)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </span>
  );
}
