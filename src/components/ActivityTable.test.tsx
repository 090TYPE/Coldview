import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTable } from './ActivityTable';
import { FlowsSummary } from './FlowsSummary';
import type { ActivityRow, FlowRow } from '../data/types';

const rows: ActivityRow[] = [
  { chainId: 'ethereum', txHash: '0x1', timestamp: 1717200000, direction: 'in', symbol: 'USDC', contract: '0xu', decimals: 6, rawAmount: '3120000', counterparty: '0xabc', usdAtTime: 3120 },
  { chainId: 'ethereum', txHash: '0x2', timestamp: 1717100000, direction: 'out', symbol: 'ETH', contract: null, decimals: 18, rawAmount: '1000000000000000000', counterparty: '0xdef', usdAtTime: 3000 },
];

describe('ActivityTable', () => {
  it('renders a row per transfer with token and USD-at-time', () => {
    render(<ActivityTable rows={rows} />);
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('$3,120')).toBeInTheDocument();
  });
});

describe('FlowsSummary', () => {
  it('shows invested, current and gain with the flow-based disclaimer', () => {
    const perToken: FlowRow[] = [{ symbol: 'ETH', investedUsd: 600, currentUsd: 900, gainUsd: 300 }];
    render(<FlowsSummary perToken={perToken} totalInvested={600} totalCurrent={900} totalGain={300} />);
    expect(screen.getByText(/invested/i)).toBeInTheDocument();
    expect(screen.getByText(/flow-based/i)).toBeInTheDocument();
    expect(screen.getByText('$900')).toBeInTheDocument();
  });
});
