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
});
