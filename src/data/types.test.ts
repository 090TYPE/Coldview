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
  it('keeps precision for large 18-decimal balances beyond Number.MAX_SAFE_INTEGER', () => {
    // ~9,999,999,999.123456789012345678 tokens with 18 decimals.
    // The raw integer (29 digits) exceeds what a double can represent exactly, so a
    // naive `Number(rawBalance) / 10 ** decimals` rounds the integer first and loses
    // precision (diverges from the true value by ~1.9e-6, i.e. beyond 6 decimal places).
    expect(toAmount('9999999999123456789012345678', 18)).toBeCloseTo(9999999999.123457, 6);
  });
});
