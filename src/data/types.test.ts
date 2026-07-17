import { describe, it, expect } from 'vitest';
import { keyOf, toAmount } from './types';

describe('keyOf', () => {
  it('builds a key for an ERC-20 token', () => {
    expect(keyOf('arbitrum', '0xABc')).toBe('arbitrum:0xabc');
  });
  it('uses "native" for the native coin', () => {
    expect(keyOf('ethereum', null)).toBe('ethereum:native');
  });
});

describe('toAmount', () => {
  it('converts a raw integer string by decimals', () => {
    expect(toAmount('1500000', 6)).toBeCloseTo(1.5, 9);
  });
  it('handles 18 decimals', () => {
    expect(toAmount('2271000000000000000', 18)).toBeCloseTo(2.271, 9);
  });
});
