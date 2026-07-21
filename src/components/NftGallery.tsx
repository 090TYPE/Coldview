import { useState } from 'react';
import { getChain } from '../config/chains';
import type { Nft } from '../data/types';

function NftCard({ nft }: { nft: Nft }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="bg-panel border border-border rounded-[10px] overflow-hidden">
      <div className="aspect-square bg-[#0f171e] flex items-center justify-center">
        {nft.imageUrl && !failed ? (
          <img
            src={nft.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-muted text-[10px] uppercase tracking-widest">No image</span>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-[12.5px] font-bold text-heading truncate" title={nft.name}>{nft.name}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-muted truncate" title={nft.collection}>{nft.collection}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted shrink-0 ml-1">{getChain(nft.chainId).name}</span>
        </div>
      </div>
    </div>
  );
}

export function NftGallery({ nfts }: { nfts: Nft[] }) {
  if (nfts.length === 0) {
    return <div className="text-muted text-[12px] text-center py-10">No NFTs found for these wallets.</div>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {nfts.map((n) => (
        <NftCard key={`${n.chainId}:${n.contract}:${n.tokenId}`} nft={n} />
      ))}
    </div>
  );
}
