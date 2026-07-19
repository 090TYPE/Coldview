import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare } from './share';
import type { Wallet } from './walletStore';

const evm: Wallet = { address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', label: 'Main', family: 'evm' };

describe('encodeShare / decodeShare', () => {
  it('round-trips wallets and chains through a URL-safe string', () => {
    const enc = encodeShare([evm], ['ethereum', 'base']);
    expect(enc).toMatch(/^[A-Za-z0-9\-_]+$/); // URL-safe, no padding
    const dec = decodeShare(enc)!;
    expect(dec.chains).toEqual(['ethereum', 'base']);
    expect(dec.wallets).toEqual([evm]);
  });

  it('re-derives the family from the address rather than trusting the payload', () => {
    const dec = decodeShare(encodeShare([evm], ['ethereum']))!;
    expect(dec.wallets[0].family).toBe('evm');
  });

  it('returns null for garbage or an empty wallet set', () => {
    expect(decodeShare('not-base64!!')).toBeNull();
    expect(decodeShare(encodeShare([], ['ethereum']))).toBeNull();
  });
});
