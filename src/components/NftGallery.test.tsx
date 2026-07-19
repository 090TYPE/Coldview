import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NftGallery } from './NftGallery';
import type { Nft } from '../data/types';

const nfts: Nft[] = [
  { chainId: 'ethereum', contract: '0xC', tokenId: '1', name: 'Ape #1', collection: 'Apes', imageUrl: 'https://img/1.png' },
];

describe('NftGallery', () => {
  it('renders a card per nft with image and name', () => {
    const { container } = render(<NftGallery nfts={nfts} />);
    expect(screen.getByText('Ape #1')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://img/1.png"]')).not.toBeNull();
  });

  it('shows an empty state when there are no nfts', () => {
    render(<NftGallery nfts={[]} />);
    expect(screen.getByText(/no nfts found/i)).toBeInTheDocument();
  });
});
