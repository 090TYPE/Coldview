import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoldingsPanel } from './HoldingsPanel';
import type { Holding } from '../data/types';

const h = (p: Partial<Holding>): Holding => ({
  key: 'k', chainId: 'ethereum', symbol: 'ETH', amount: 1, priceUsd: 1, valueUsd: 5000, change24hPct: 0, iconUrl: null, ...p,
});

describe('HoldingsPanel', () => {
  it('hides dust (< $1) when the toggle is on', async () => {
    render(<HoldingsPanel holdings={[h({ symbol: 'BIG', valueUsd: 5000 }), h({ key: 'k2', symbol: 'DUST', valueUsd: 0.4 })]} />);
    expect(screen.getByText('DUST')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /hide dust/i }));
    expect(screen.queryByText('DUST')).not.toBeInTheDocument();
    expect(screen.getByText('BIG')).toBeInTheDocument();
  });

  it('has an Export CSV button', () => {
    render(<HoldingsPanel holdings={[h({})]} />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });
});
