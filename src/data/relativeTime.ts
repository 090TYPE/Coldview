// Compact "N ago" label for a past timestamp (ms). Empty string when unknown/zero.
export function relativeTime(fromMs: number | undefined, nowMs: number = Date.now()): string {
  if (!fromMs) return '';
  const s = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
