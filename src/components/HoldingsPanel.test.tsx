import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoldingsPanel } from './HoldingsPanel';
import { useAppStore } from '../state/store';
import type { Holding } from '../data/types';

const h = (p: Partial<Holding>): Holding => ({
  key: 'k', chainId: 'ethereum', symbol: 'ETH', amount: 1, priceUsd: 1, valueUsd: 5000, change24hPct: 0, iconUrl: null, ...p,
});

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ hiddenKeys: [] });
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

  it('hides a token and lists it under the hidden section', async () => {
    render(<HoldingsPanel holdings={[h({ key: 'good', symbol: 'GOOD' }), h({ key: 'spam', symbol: 'SPAM' })]} />);
    await userEvent.click(screen.getByRole('button', { name: /hide SPAM/i }));
    // SPAM leaves the main list; a "Hidden (1)" toggle appears.
    expect(screen.getByText('GOOD')).toBeInTheDocument();
    expect(screen.queryByText('SPAM')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /hidden \(1\)/i }));
    expect(screen.getByText('SPAM')).toBeInTheDocument(); // now shown in the hidden section
  });
});
