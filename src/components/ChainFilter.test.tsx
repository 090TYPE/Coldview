import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChainFilter } from './ChainFilter';

describe('ChainFilter', () => {
  it('marks enabled chains and toggles on click', async () => {
    const onToggle = vi.fn();
    render(<ChainFilter enabled={['ethereum', 'base']} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Arbitrum' }));
    expect(onToggle).toHaveBeenCalledWith('arbitrum');
  });
});
