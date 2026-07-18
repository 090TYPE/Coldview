import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './store';

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState(useAppStore.getInitialState());
});

describe('app store', () => {
  it('adds and removes wallets and persists them', () => {
    useAppStore.getState().addWallet('0x' + 'a'.repeat(40), 'Main');
    expect(useAppStore.getState().wallets).toHaveLength(1);
    const addr = useAppStore.getState().wallets[0].address;
    useAppStore.getState().removeWallet(addr);
    expect(useAppStore.getState().wallets).toHaveLength(0);
  });

  it('ignores invalid addresses', () => {
    useAppStore.getState().addWallet('bad', 'X');
    expect(useAppStore.getState().wallets).toHaveLength(0);
  });

  it('toggles enabled chains and defaults to all chains enabled', () => {
    const s = useAppStore.getState();
    expect(s.enabledChains).toContain('ethereum');
    s.toggleChain('ethereum');
    expect(useAppStore.getState().enabledChains).not.toContain('ethereum');
  });

  it('sets period and api key', () => {
    useAppStore.getState().setPeriod('7d');
    expect(useAppStore.getState().period).toBe('7d');
    useAppStore.getState().setApiKey('k');
    expect(useAppStore.getState().byokKey).toBe('k');
  });

  it('adds a Solana wallet without lowercasing its case-sensitive address', () => {
    const addr = '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs';
    useAppStore.getState().addWallet(addr, 'Sol');
    const w = useAppStore.getState().wallets[0];
    expect(w.address).toBe(addr);
    expect(w.family).toBe('solana');
  });

  it('lowercases EVM addresses and tags them evm', () => {
    useAppStore.getState().addWallet('0x' + 'A'.repeat(40), 'Main');
    const w = useAppStore.getState().wallets[0];
    expect(w.address).toBe('0x' + 'a'.repeat(40));
    expect(w.family).toBe('evm');
  });
});
