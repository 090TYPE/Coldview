import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders a polyline for a series of two or more points', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    expect(container.querySelector('polyline')).not.toBeNull();
  });

  it('renders a placeholder when there is not enough data', () => {
    const { container } = render(<Sparkline data={[1]} />);
    expect(container.querySelector('polyline')).toBeNull();
  });
});
