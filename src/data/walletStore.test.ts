import { describe, it, expect, beforeEach } from 'vitest';
import { loadWallets, saveWallets, isValidAddress, loadApiKey, saveApiKey } from './walletStore';

beforeEach(() => localStorage.clear());

describe('isValidAddress', () => {
  it('accepts EVM, Solana and Bitcoin addresses', () => {
    expect(isValidAddress('0x' + 'a'.repeat(40))).toBe(true);
    expect(isValidAddress('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs')).toBe(true);
    expect(isValidAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true);
  });
  it('rejects malformed input', () => {
    expect(isValidAddress('nope')).toBe(false);
    expect(isValidAddress('0x123')).toBe(false);
  });
});

describe('wallet persistence', () => {
  it('round-trips wallets including family', () => {
    saveWallets([{ address: '0xabc', label: 'Main', family: 'evm' }]);
    expect(loadWallets()).toEqual([{ address: '0xabc', label: 'Main', family: 'evm' }]);
  });
  it('backfills family for legacy wallets stored without one', () => {
    localStorage.setItem('coldview:wallets', JSON.stringify([{ address: '0x' + 'a'.repeat(40), label: 'Old' }]));
    expect(loadWallets()[0].family).toBe('evm');
  });
  it('drops legacy wallets whose address no longer detects to a family', () => {
    localStorage.setItem('coldview:wallets', JSON.stringify([{ address: 'garbage', label: 'X' }]));
    expect(loadWallets()).toEqual([]);
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
