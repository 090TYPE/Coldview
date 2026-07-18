import { detectFamily, type Family } from './family';

export interface Wallet {
  address: string;
  label: string;
  family: Family;
}

const WALLETS_KEY = 'coldview:wallets';
const APIKEY_KEY = 'coldview:apikey';

export function isValidAddress(addr: string): boolean {
  return detectFamily(addr) !== null;
}

interface StoredWallet {
  address: string;
  label: string;
  family?: Family;
}

export function loadWallets(): Wallet[] {
  try {
    const raw = localStorage.getItem(WALLETS_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredWallet[];
    const out: Wallet[] = [];
    for (const w of stored) {
      const family = w.family ?? detectFamily(w.address); // backfill legacy wallets
      if (!family) continue; // drop wallets we can no longer classify
      out.push({ address: w.address, label: w.label, family });
    }
    return out;
  } catch {
    return [];
  }
}

export function saveWallets(wallets: Wallet[]): void {
  localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

export function loadApiKey(): string {
  return localStorage.getItem(APIKEY_KEY) ?? '';
}

export function saveApiKey(key: string): void {
  localStorage.setItem(APIKEY_KEY, key);
}
