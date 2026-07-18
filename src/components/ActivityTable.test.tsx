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
  it('shows received/sent/net for recent flows with a not-full-P&L disclaimer', () => {
    const perToken: FlowRow[] = [{ symbol: 'ETH', inUsd: 1000, outUsd: 400, netUsd: 600 }];
    render(<FlowsSummary perToken={perToken} totalIn={1000} totalOut={400} totalNet={600} />);
    expect(screen.getByText(/received/i)).toBeInTheDocument();
    expect(screen.getByText(/recent flows/i)).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });
});
