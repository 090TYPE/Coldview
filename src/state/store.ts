import { create } from 'zustand';
import type { ChainId } from '../data/types';
import { CHAINS } from '../config/chains';
import { detectFamily } from '../data/family';
import {
  loadWallets, saveWallets, loadApiKey, saveApiKey, type Wallet,
} from '../data/walletStore';
import { loadAlerts, saveAlerts, type Alert } from '../data/alerts';

export type Period = '24h' | '7d' | '30d' | 'all';
export type View = 'portfolio' | 'activity' | 'nfts' | 'pnl' | 'alerts';

interface AppState {
  wallets: Wallet[];
  enabledChains: ChainId[];
  period: Period;
  byokKey: string;
  view: View;
  alerts: Alert[];
  hiddenKeys: string[];
  currency: string;
  fxRates: Record<string, number>;
  addWallet: (address: string, label: string) => void;
  removeWallet: (address: string) => void;
  toggleChain: (id: ChainId) => void;
  setPeriod: (p: Period) => void;
  setApiKey: (k: string) => void;
  setView: (v: View) => void;
  addAlert: (symbol: string, direction: 'above' | 'below', target: number) => void;
  removeAlert: (id: string) => void;
  setAlertTriggered: (id: string, triggered: boolean) => void;
  hideToken: (key: string) => void;
  unhideToken: (key: string) => void;
  setCurrency: (c: string) => void;
  setFxRates: (r: Record<string, number>) => void;
}

const HIDDEN_KEY = 'coldview:hidden';
function loadHidden(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  wallets: loadWallets(),
  enabledChains: CHAINS.map((c) => c.id),
  period: '30d',
  byokKey: loadApiKey(),
  view: 'portfolio',
  alerts: loadAlerts(),
  hiddenKeys: loadHidden(),
  currency: localStorage.getItem('coldview:currency') ?? 'USD',
  fxRates: { USD: 1 },

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

  addAlert: (symbol, direction, target) => {
    const alert: Alert = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, symbol: symbol.trim().toUpperCase(), direction, target, triggered: false };
    const alerts = [...get().alerts, alert];
    saveAlerts(alerts);
    set({ alerts });
  },

  removeAlert: (id) => {
    const alerts = get().alerts.filter((a) => a.id !== id);
    saveAlerts(alerts);
    set({ alerts });
  },

  setAlertTriggered: (id, triggered) => {
    const alerts = get().alerts.map((a) => (a.id === id ? { ...a, triggered } : a));
    saveAlerts(alerts);
    set({ alerts });
  },

  hideToken: (key) => {
    const hiddenKeys = [...new Set([...get().hiddenKeys, key])];
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenKeys));
    set({ hiddenKeys });
  },

  unhideToken: (key) => {
    const hiddenKeys = get().hiddenKeys.filter((k) => k !== key);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenKeys));
    set({ hiddenKeys });
  },

  setCurrency: (currency) => {
    localStorage.setItem('coldview:currency', currency);
    set({ currency });
  },

  setFxRates: (fxRates) => set({ fxRates }),
}));
