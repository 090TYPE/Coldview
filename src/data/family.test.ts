import { describe, it, expect } from 'vitest';
import { detectFamily } from './family';

describe('detectFamily', () => {
  it('detects an EVM address', () => {
    expect(detectFamily('0x' + 'a'.repeat(40))).toBe('evm');
    expect(detectFamily('0x' + 'A'.repeat(40))).toBe('evm');
  });
  it('detects a Bitcoin bech32 address', () => {
    expect(detectFamily('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe('bitcoin');
  });
  it('detects a Bitcoin legacy address', () => {
    expect(detectFamily('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('bitcoin');
    expect(detectFamily('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe('bitcoin');
  });
  it('detects a Solana address', () => {
    expect(detectFamily('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs')).toBe('solana');
  });
  it('returns null for garbage', () => {
    expect(detectFamily('nope')).toBeNull();
    expect(detectFamily('')).toBeNull();
    expect(detectFamily('0x123')).toBeNull();
  });
});
