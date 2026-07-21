import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenDetail, tokenLinks } from './TokenDetail';
import type { Holding } from '../data/types';

const holding: Holding = {
  key: 'ethereum:0xabc', chainId: 'ethereum', symbol: 'USDC',
  amount: 100, priceUsd: 1, valueUsd: 100, change24hPct: 0, iconUrl: null,
};

describe('tokenLinks', () => {
  it('builds an explorer token link and a dexscreener link for an EVM token', () => {
    const links = tokenLinks('ethereum', '0xabc');
    expect(links.find((l) => l.label === 'Explorer')?.url).toBe('https://eth.blockscout.com/token/0xabc');
    expect(links.find((l) => l.label === 'Dexscreener')?.url).toContain('0xabc');
  });

  it('omits the dexscreener link for a native coin', () => {
    const links = tokenLinks('ethereum', null);
    expect(links.some((l) => l.label === 'Dexscreener')).toBe(false);
  });
});

describe('TokenDetail', () => {
  it('shows the token value and quick links, and closes on ×', async () => {
    const onClose = vi.fn();
    render(<TokenDetail holding={holding} onClose={onClose} />);
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explorer/i })).toHaveAttribute('href', 'https://eth.blockscout.com/token/0xabc');
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
