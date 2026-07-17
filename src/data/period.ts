import type { Period } from '../state/store';
import type { SnapshotPoint } from './snapshot';

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_MS: Record<Period, number | null> = {
  '24h': DAY,
  '7d': 7 * DAY,
  '30d': 30 * DAY,
  'all': null,
};

export function filterSeriesByPeriod(
  series: SnapshotPoint[],
  period: Period,
  now: number = Date.now(),
): SnapshotPoint[] {
  const window = WINDOW_MS[period];
  if (window === null) return series;
  return series.filter((p) => p.t >= now - window);
}
