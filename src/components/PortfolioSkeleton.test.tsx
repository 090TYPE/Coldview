import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioSkeleton } from './PortfolioSkeleton';

describe('PortfolioSkeleton', () => {
  it('exposes an accessible loading status', () => {
    render(<PortfolioSkeleton />);
    expect(screen.getByRole('status', { name: /loading portfolio/i })).toBeInTheDocument();
  });

  it('renders several shimmering placeholder blocks and skeleton rows', () => {
    const { container } = render(<PortfolioSkeleton rows={5} />);
    // The hero/allocation blocks plus 5 table rows should yield many skeleton elements.
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(6);
  });
});
