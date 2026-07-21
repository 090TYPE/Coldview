import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshControl } from './RefreshControl';

describe('RefreshControl', () => {
  it('shows an "Updated … ago" label and calls onRefresh when clicked', async () => {
    const onRefresh = vi.fn();
    render(<RefreshControl updatedAt={Date.now() - 5 * 60_000} isFetching={false} onRefresh={onRefresh} />);
    expect(screen.getByText(/Updated .*ago/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows "Updating…" and disables the button while fetching', () => {
    render(<RefreshControl updatedAt={Date.now()} isFetching onRefresh={() => {}} />);
    expect(screen.getByText(/updating/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
  });
});
