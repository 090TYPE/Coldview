import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertsView } from './AlertsView';
import { useAppStore } from '../state/store';
import type { Holding } from '../data/types';

const eth: Holding = { key: 'ethereum:native', chainId: 'ethereum', symbol: 'ETH', amount: 1, priceUsd: 3000, valueUsd: 3000, change24hPct: 0, iconUrl: null };

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ alerts: [] });
});

describe('AlertsView', () => {
  it('adds an alert and then removes it', async () => {
    render(<AlertsView holdings={[eth]} />);
    await userEvent.type(screen.getByPlaceholderText('ETH'), 'ETH');
    await userEvent.type(screen.getByPlaceholderText('3500'), '4000');
    await userEvent.click(screen.getByRole('button', { name: /add alert/i }));

    expect(screen.getByText('above $4,000.00')).toBeInTheDocument();
    expect(screen.getByText('armed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /remove eth alert/i }));
    expect(screen.queryByText('above $4,000.00')).not.toBeInTheDocument();
  });
});
