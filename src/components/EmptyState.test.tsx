import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  afterEach(() => vi.restoreAllMocks());

  it('validates and submits a wallet address', async () => {
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);
    const input = screen.getByPlaceholderText(/address or ens/i);
    await userEvent.type(input, '0x' + 'a'.repeat(40));
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith('0x' + 'a'.repeat(40));
  });

  it('shows an error for an invalid address and does not submit', async () => {
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);
    await userEvent.type(screen.getByPlaceholderText(/address or ens/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/valid address/i)).toBeInTheDocument();
  });

  it('resolves an ENS name to an address and adds it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ address: '0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name: 'vitalik.eth', avatar: null }),
    } as Response)));
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);
    await userEvent.type(screen.getByPlaceholderText(/address or ens/i), 'vitalik.eth');
    await userEvent.click(screen.getByRole('button', { name: /add|resolving/i }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('0xd8da6bf26964af9d7eed9e03e53415d37aa96045'));
  });
});
