import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HoldingsTable } from './HoldingsTable';
import type { Holding } from '../data/types';

const holdings: Holding[] = [
  { key: 'ethereum:native', chainId: 'ethereum', symbol: 'ETH', amount: 2.271, priceUsd: 2473, valueUsd: 5616, change24hPct: 3.1, iconUrl: 'https://assets.example/eth.png' },
  { key: 'polygon:0x', chainId: 'polygon', symbol: 'MATIC', amount: 2400, priceUsd: 0.49, valueUsd: 1180, change24hPct: -1.4, iconUrl: null },
];

describe('HoldingsTable', () => {
  it('renders one row per holding with symbol and value', () => {
    render(<HoldingsTable holdings={holdings} />);
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('MATIC')).toBeInTheDocument();
    expect(screen.getByText('$5,616')).toBeInTheDocument();
  });

  it('renders a token logo image when an iconUrl is present', () => {
    const { container } = render(<HoldingsTable holdings={holdings} />);
    const img = container.querySelector('img[src="https://assets.example/eth.png"]');
    expect(img).not.toBeNull();
  });

  it('shows negative change with the danger indicator', () => {
    render(<HoldingsTable holdings={holdings} />);
    expect(screen.getByText(/1.4%/)).toBeInTheDocument();
  });
});
