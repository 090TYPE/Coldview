import { describe, it, expect } from 'vitest';
import { parseNftItems } from './parseNft';

describe('parseNftItems', () => {
  it('maps items to nfts, preferring image_url and metadata name', () => {
    const raw = {
      items: [
        { id: '42', image_url: 'https://img/x.png', metadata: { name: 'Cool Ape', image: 'ipfs://y' }, token: { address: '0xC', name: 'Cool Apes', symbol: 'APE' } },
      ],
    };
    const out = parseNftItems(raw, 'ethereum');
    expect(out).toEqual([
      { chainId: 'ethereum', contract: '0xC', tokenId: '42', name: 'Cool Ape', collection: 'Cool Apes', imageUrl: 'https://img/x.png' },
    ]);
  });

  it('falls back to a synthesized name and null image, and skips items with no token', () => {
    const raw = {
      items: [
        { id: '7', token: { address: '0xD', symbol: 'PUNK' } },
        { id: '9' }, // no token -> skipped
      ],
    };
    const out = parseNftItems(raw, 'base');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'PUNK #7', collection: 'PUNK', imageUrl: null });
  });
});
