import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApprovalsSection } from './ApprovalsSection';
import type { TokenApproval, Holding } from '../data/types';

const base: TokenApproval = {
  chainId: 'ethereum', owner: '0x' + 'a'.repeat(40),
  tokenAddress: '0x' + 'd'.repeat(40), spender: '0x' + 'b'.repeat(40),
  amount: null, blockNumber: 10, txHash: '0x' + 'e'.repeat(64),
};
const holdings: Holding[] = [
  { key: 'ethereum:0x' + 'd'.repeat(40), chainId: 'ethereum', symbol: 'USDC',
    amount: 5, priceUsd: 1, valueUsd: 5, change24hPct: null, iconUrl: null },
];

describe('ApprovalsSection', () => {
  it('shows the empty state when there are no approvals', () => {
    render(<ApprovalsSection approvals={[]} holdings={[]} isLoading={false} />);
    expect(screen.getByText(/No active token approvals/i)).toBeInTheDocument();
  });

  it('renders an unlimited approval with the token symbol from holdings', () => {
    render(<ApprovalsSection approvals={[base]} holdings={holdings} isLoading={false} />);
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText(/Unlimited/i)).toBeInTheDocument();
  });

  it('shows Limited for a finite approval and a revoke link', () => {
    render(<ApprovalsSection approvals={[{ ...base, amount: '1000' }]} holdings={[]} isLoading={false} />);
    expect(screen.getByText(/Limited/i)).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `https://revoke.cash/address/${base.owner}`);
  });

  it('renders separate rows for two wallets approving the same token+spender', () => {
    const a1 = { ...base, owner: '0x' + '1'.repeat(40) };
    const a2 = { ...base, owner: '0x' + '2'.repeat(40) };
    render(<ApprovalsSection approvals={[a1, a2]} holdings={[]} isLoading={false} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', `https://revoke.cash/address/${a1.owner}`);
    expect(links[1]).toHaveAttribute('href', `https://revoke.cash/address/${a2.owner}`);
  });

  it('shows a loading skeleton while loading', () => {
    const { container } = render(<ApprovalsSection approvals={[]} holdings={[]} isLoading={true} />);
    expect(screen.queryByText(/No active token approvals/i)).not.toBeInTheDocument();
    expect(container.querySelector('table')).toBeNull();
  });
});
