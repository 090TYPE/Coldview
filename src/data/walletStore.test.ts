import { describe, it, expect, beforeEach } from 'vitest';
import { loadWallets, saveWallets, isValidAddress, loadApiKey, saveApiKey } from './walletStore';

beforeEach(() => localStorage.clear());

describe('isValidAddress', () => {
  it('accepts a 0x + 40 hex address', () => {
    expect(isValidAddress('0x' + 'a'.repeat(40))).toBe(true);
  });
  it('rejects malformed input', () => {
    expect(isValidAddress('nope')).toBe(false);
    expect(isValidAddress('0x123')).toBe(false);
  });
});

describe('wallet persistence', () => {
  it('round-trips the wallet list', () => {
    saveWallets([{ address: '0xabc', label: 'Main' }]);
    expect(loadWallets()).toEqual([{ address: '0xabc', label: 'Main' }]);
  });
  it('returns [] when nothing is stored', () => {
    expect(loadWallets()).toEqual([]);
  });
});

describe('BYOK api key', () => {
  it('round-trips the key and defaults to empty', () => {
    expect(loadApiKey()).toBe('');
    saveApiKey('secret');
    expect(loadApiKey()).toBe('secret');
  });
});
