import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('validates and submits a wallet address', async () => {
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);
    const input = screen.getByPlaceholderText(/0x/i);
    await userEvent.type(input, '0x' + 'a'.repeat(40));
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith('0x' + 'a'.repeat(40));
  });

  it('shows an error for an invalid address and does not submit', async () => {
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);
    await userEvent.type(screen.getByPlaceholderText(/0x/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/valid address/i)).toBeInTheDocument();
  });
});
