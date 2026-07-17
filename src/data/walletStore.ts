export interface Wallet {
  address: string;
  label: string;
}

const WALLETS_KEY = 'coldview:wallets';
const APIKEY_KEY = 'coldview:apikey';

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

export function loadWallets(): Wallet[] {
  try {
    const raw = localStorage.getItem(WALLETS_KEY);
    return raw ? (JSON.parse(raw) as Wallet[]) : [];
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
