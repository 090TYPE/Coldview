import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroPanel } from './HeroPanel';
import type { SnapshotPoint } from '../data/snapshot';

const series: SnapshotPoint[] = [
  { t: 1, v: 100 },
  { t: 2, v: 120 },
];

describe('HeroPanel', () => {
  it('shows the total and an empty-history hint when only one point exists', () => {
    render(
      <HeroPanel total={120} change24h={2} walletCount={1} period="30d" onPeriod={vi.fn()} series={[{ t: 1, v: 120 }]} />,
    );
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText(/builds as you use/i)).toBeInTheDocument();
  });

  it('renders the chart label when history exists', () => {
    render(<HeroPanel total={120} change24h={2} walletCount={1} period="30d" onPeriod={vi.fn()} series={series} />);
    expect(screen.getByText(/portfolio value/i)).toBeInTheDocument();
  });
});
