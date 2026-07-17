import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TotalBalance } from './TotalBalance';
import { PeriodToggle } from './PeriodToggle';

describe('TotalBalance', () => {
  it('formats the total and shows positive 24h in neon', () => {
    render(<TotalBalance total={12480.53} change24h={3.24} walletCount={2} />);
    expect(screen.getByText('$12,480.53')).toBeInTheDocument();
    expect(screen.getByText(/3.2%/)).toBeInTheDocument();
  });
});

describe('PeriodToggle', () => {
  it('calls onChange when a period is clicked', async () => {
    const onChange = vi.fn();
    render(<PeriodToggle value="30d" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '7d' }));
    expect(onChange).toHaveBeenCalledWith('7d');
  });
});
