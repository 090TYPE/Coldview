import { useState } from 'react';

interface Props {
  iconUrl?: string | null;
  symbol: string;
  size?: number;
}

// Renders a token logo (from the balance's icon_url) with a graceful
// letter-avatar fallback when there's no URL or the image fails to load.
export function TokenIcon({ iconUrl, symbol, size = 20 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size } as const;

  if (iconUrl && !failed) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="rounded-full bg-[#0f171e] object-cover shrink-0"
        style={box}
      />
    );
  }

  const letter = (symbol || '?').slice(0, 1).toUpperCase();
  return (
    <span
      className="rounded-full bg-[#16212b] text-[#8ba0ad] inline-flex items-center justify-center shrink-0 font-bold"
      style={{ ...box, fontSize: size * 0.5 }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
