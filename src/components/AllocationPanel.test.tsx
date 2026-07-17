import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllocationPanel } from './AllocationPanel';
import type { AllocationSlice } from '../data/types';

const byToken: AllocationSlice[] = [
  { label: 'ETH', valueUsd: 7500, pct: 75 },
  { label: 'USDC', valueUsd: 2500, pct: 25 },
];
const byChain: AllocationSlice[] = [
  { label: 'Ethereum', valueUsd: 7500, pct: 75 },
  { label: 'Arbitrum', valueUsd: 2500, pct: 25 },
];

describe('AllocationPanel', () => {
  it('lists token allocation with percentages', () => {
    render(<AllocationPanel byToken={byToken} byChain={byChain} />);
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
