import type { ChainId, Nft } from './types';

interface BsNftItem {
  id?: string;
  image_url?: string | null;
  media_url?: string | null;
  metadata?: { name?: string | null; image?: string | null } | null;
  token?: { address?: string; name?: string | null; symbol?: string | null } | null;
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 6)}…` : id;
}

// Prefer Blockscout's gateway-resolved image_url/media_url; fall back to raw
// metadata.image (may be ipfs:// and fail to load — the card degrades to a
// placeholder in that case).
export function parseNftItems(raw: unknown, chainId: ChainId): Nft[] {
  const items = (raw as { items?: BsNftItem[] })?.items;
  if (!Array.isArray(items)) return [];
  const out: Nft[] = [];
  for (const it of items) {
    if (!it.token) continue;
    const collection = it.token.name || it.token.symbol || 'Unknown collection';
    const tokenId = it.id ?? '';
    const name = it.metadata?.name || `${it.token.name || it.token.symbol || 'NFT'} #${shortId(tokenId)}`;
    const imageUrl = it.image_url || it.media_url || it.metadata?.image || null;
    out.push({ chainId, contract: it.token.address ?? '', tokenId, name, collection, imageUrl });
  }
  return out;
}
