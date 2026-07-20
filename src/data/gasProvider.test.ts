import { describe, it, expect } from 'vitest';
import { sumGasWei } from './gasProvider';

const OWNER = '0xOWNER';

describe('sumGasWei', () => {
  it('sums fees only for transactions the owner sent', () => {
    const raw = {
      items: [
        { from: { hash: '0xowner' }, fee: { value: '1000' } },   // paid by owner
        { from: { hash: '0xother' }, fee: { value: '9999' } },   // incoming — owner paid nothing
        { from: { hash: '0xOWNER' }, fee: { value: '500' } },    // case-insensitive match
      ],
    };
    expect(sumGasWei(raw, OWNER)).toBe(1500n);
  });

  it('returns 0n for empty or malformed input', () => {
    expect(sumGasWei({ items: [] }, OWNER)).toBe(0n);
    expect(sumGasWei(null, OWNER)).toBe(0n);
  });
});
