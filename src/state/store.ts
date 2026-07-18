import { create } from 'zustand';
import type { ChainId } from '../data/types';
import { CHAINS } from '../config/chains';
import { detectFamily } from '../data/family';
import {
  loadWallets, saveWallets, loadApiKey, saveApiKey, type Wallet,
} from '../data/walletStore';

export type Period = '24h' | '7d' | '30d' | 'all';
export type View = 'portfolio' | 'activity';

interface AppState {
  wallets: Wallet[];
  enabledChains: ChainId[];
  period: Period;
  byokKey: string;
  view: View;
  addWallet: (address: string, label: string) => void;
  removeWallet: (address: string) => void;
  toggleChain: (id: ChainId) => void;
  setPeriod: (p: Period) => void;
  setApiKey: (k: string) => void;
  setView: (v: View) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  wallets: loadWallets(),
  enabledChains: CHAINS.map((c) => c.id),
  period: '30d',
  byokKey: loadApiKey(),
  view: 'portfolio',

  addWallet: (address, label) => {
    const family = detectFamily(address);
    if (!family) return;
    // Only EVM addresses are case-insensitive; Solana/Bitcoin are case-sensitive.
    const normalized = family === 'evm' ? address.trim().toLowerCase() : address.trim();
    if (get().wallets.some((w) => w.address === normalized)) return;
    const wallets = [...get().wallets, { address: normalized, label: label.trim() || 'Wallet', family }];
    saveWallets(wallets);
    set({ wallets });
  },

  removeWallet: (address) => {
    const wallets = get().wallets.filter((w) => w.address !== address);
    saveWallets(wallets);
    set({ wallets });
  },

  toggleChain: (id) => {
    const on = get().enabledChains.includes(id);
    set({ enabledChains: on ? get().enabledChains.filter((c) => c !== id) : [...get().enabledChains, id] });
  },

  setPeriod: (period) => set({ period }),

  setApiKey: (byokKey) => {
    saveApiKey(byokKey);
    set({ byokKey });
  },

  setView: (view) => set({ view }),
}));
