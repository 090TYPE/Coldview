import { getChain } from '../config/chains';
import { Label, LoadingSkeleton } from './primitives';
import type { Holding, TokenApproval } from '../data/types';

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

interface Props {
  approvals: TokenApproval[];
  holdings: Holding[];
  isLoading: boolean;
}

export function ApprovalsSection({ approvals, holdings, isLoading }: Props) {
  const symbolByKey = new Map(holdings.map((h) => [h.key.toLowerCase(), h.symbol]));

  // Unlimited (highest risk) first, then most recent.
  const rows = [...approvals].sort((a, b) => {
    const au = a.amount === null ? 0 : 1;
    const bu = b.amount === null ? 0 : 1;
    if (au !== bu) return au - bu;
    return b.blockNumber - a.blockNumber;
  });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <Label>Token approvals</Label>
      </div>
      <p className="text-[11px] text-muted mb-2">
        Shows the last approved limit from on-chain logs — the actual remaining allowance may be lower.
      </p>
      {isLoading ? (
        <LoadingSkeleton />
      ) : rows.length === 0 ? (
        <div className="text-muted text-[12px] text-center py-6">No active token approvals found.</div>
      ) : (
        <div className="bg-panel border border-border rounded-[10px] overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-muted text-[10px] uppercase tracking-widest">
                <th className="text-left p-2.5 border-b border-border">Asset</th>
                <th className="text-left p-2.5 border-b border-border">Spender</th>
                <th className="text-right p-2.5 border-b border-border">Allowance</th>
                <th className="text-left p-2.5 border-b border-border">Chain</th>
                <th className="text-right p-2.5 border-b border-border" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const symbol =
                  symbolByKey.get(`${a.chainId}:${a.tokenAddress}`.toLowerCase()) ??
                  shortAddr(a.tokenAddress);
                return (
                  <tr key={`${a.chainId}:${a.owner}:${a.tokenAddress}:${a.spender}`}>
                    <td className="p-2.5 border-b border-row font-bold text-heading">{symbol}</td>
                    <td className="p-2.5 border-b border-row font-mono text-[11px] text-muted">{shortAddr(a.spender)}</td>
                    <td className="p-2.5 border-b border-row text-right">
                      {a.amount === null ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-danger/50 text-danger">Unlimited</span>
                      ) : (
                        <span className="text-muted" title={`Approved value: ${a.amount} (raw, no decimals)`}>Limited</span>
                      )}
                    </td>
                    <td className="p-2.5 border-b border-row text-muted">{getChain(a.chainId).name}</td>
                    <td className="p-2.5 border-b border-row text-right">
                      <a
                        className="text-blue hover:underline"
                        href={`https://revoke.cash/address/${a.owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Review & revoke on revoke.cash (opens in a new tab)"
                      >
                        ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
