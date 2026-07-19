interface Props {
  data?: number[];
  width?: number;
  height?: number;
}

// Minimal inline SVG sparkline — green when the last point is at/above the
// first, red otherwise. Renders a subtle placeholder when there's no series.
export function Sparkline({ data, width = 64, height = 20 }: Props) {
  if (!data || data.length < 2) {
    return <span className="text-muted text-[10px]">—</span>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(' ');
  const up = data[data.length - 1] >= data[0];
  const color = up ? '#22e6a4' : '#ff5c72';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="7-day price trend">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
