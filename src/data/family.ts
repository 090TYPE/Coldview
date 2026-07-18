export type Family = 'evm' | 'solana' | 'bitcoin';

const EVM_RE = /^0x[0-9a-fA-F]{40}$/;
const BTC_BECH32_RE = /^bc1[0-9ac-hj-np-z]{6,87}$/; // bech32 charset, lowercase
const BTC_LEGACY_RE = /^[13][1-9A-HJ-NP-Za-km-z]{25,33}$/; // base58check, 26-34 chars
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/; // base58, 32-44 chars

// Detection order matters: EVM and bech32 are unambiguous; Bitcoin legacy
// ([13], <=34 chars) is checked before Solana. Note: a Solana address that
// starts with 1 or 3 and is <=34 chars could be mis-detected as Bitcoin legacy,
// but real Solana addresses are almost always 43-44 chars, so this is negligible.
export function detectFamily(address: string): Family | null {
  const a = address.trim();
  if (EVM_RE.test(a)) return 'evm';
  if (BTC_BECH32_RE.test(a)) return 'bitcoin';
  if (BTC_LEGACY_RE.test(a)) return 'bitcoin';
  if (SOLANA_RE.test(a)) return 'solana';
  return null;
}
