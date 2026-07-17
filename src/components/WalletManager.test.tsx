import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletManager } from './WalletManager';
import type { Wallet } from '../data/walletStore';

const wallets: Wallet[] = [{ address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', label: 'Main' }];

describe('WalletManager', () => {
  it('renders wallet chips with a shortened address', () => {
    render(<WalletManager wallets={wallets} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/Main/)).toBeInTheDocument();
    expect(screen.getByText(/0x1a2b…9a0b/)).toBeInTheDocument();
  });

  it('removes a wallet when its × is clicked', async () => {
    const onRemove = vi.fn();
    render(<WalletManager wallets={wallets} onAdd={vi.fn()} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /remove Main/i }));
    expect(onRemove).toHaveBeenCalledWith(wallets[0].address);
  });
});
