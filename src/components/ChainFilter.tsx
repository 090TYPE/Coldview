import { CHAINS } from '../config/chains';
import { Label } from './primitives';
import type { ChainId } from '../data/types';

export function ChainFilter({ enabled, onToggle }: { enabled: ChainId[]; onToggle: (id: ChainId) => void }) {
  return (
    <div className="flex gap-1.5 items-center flex-wrap mb-3.5">
      <span className="mr-1"><Label>chains</Label></span>
      {CHAINS.map((c) => {
        const on = enabled.includes(c.id);
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${on ? 'border-neon text-neon bg-neon/10' : 'border-border text-[#9fb0bd]'}`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
