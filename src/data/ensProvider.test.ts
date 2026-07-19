import { describe, it, expect, vi, afterEach } from 'vitest';
import { looksLikeEnsName, resolveEns } from './ensProvider';

afterEach(() => vi.restoreAllMocks());

describe('looksLikeEnsName', () => {
  it('accepts dotted names, rejects addresses and junk', () => {
    expect(looksLikeEnsName('vitalik.eth')).toBe(true);
    expect(looksLikeEnsName('foo.bar.eth')).toBe(true);
    expect(looksLikeEnsName('0x' + 'a'.repeat(40))).toBe(false);
    expect(looksLikeEnsName('nope')).toBe(false);
    expect(looksLikeEnsName('')).toBe(false);
  });
});

describe('resolveEns', () => {
  it('returns address/name/avatar for a name', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ address: '0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name: 'vitalik.eth', avatar: 'https://a/x.png' }),
    } as Response)));
    const r = await resolveEns('vitalik.eth');
    expect(r).toEqual({ address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', name: 'vitalik.eth', avatar: 'https://a/x.png' });
  });
  it('returns null when there is no address', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ address: null, name: null }) } as Response)));
    expect(await resolveEns('nope.eth')).toBeNull();
  });
  it('returns null on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false } as Response)));
    expect(await resolveEns('x.eth')).toBeNull();
  });
});
