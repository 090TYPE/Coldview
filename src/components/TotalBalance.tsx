import { Label } from './primitives';
import { useMoney } from '../state/useMoney';

export function TotalBalance({ total, change24h, walletCount }: { total: number; change24h: number; walletCount: number }) {
  const up = change24h >= 0;
  const money = useMoney();
  return (
    <div>
      <Label>{`Total balance · ${walletCount} wallet${walletCount === 1 ? '' : 's'}`}</Label>
      <div className="text-[34px] font-extrabold text-[#eafff6] tracking-tight">
        {money(total, 2)}
      </div>
      <div className={`text-[13px] font-bold mt-1 ${up ? 'text-neon' : 'text-danger'}`}>
        {`${up ? '▲' : '▼'} ${Math.abs(change24h).toFixed(1)}% · 24h`}
      </div>
    </div>
  );
}
