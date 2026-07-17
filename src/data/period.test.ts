import { describe, it, expect } from 'vitest';
import { filterSeriesByPeriod } from './period';
import type { SnapshotPoint } from './snapshot';

const now = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const series: SnapshotPoint[] = [
  { t: now - 40 * DAY, v: 100 },
  { t: now - 5 * DAY, v: 120 },
  { t: now - 1000, v: 130 },
];

describe('filterSeriesByPeriod', () => {
  it('returns the whole series for "all"', () => {
    expect(filterSeriesByPeriod(series, 'all', now)).toHaveLength(3);
  });
  it('keeps only points within a 7d window', () => {
    const out = filterSeriesByPeriod(series, '7d', now);
    expect(out.map((p) => p.v)).toEqual([120, 130]);
  });
  it('keeps only points within a 24h window', () => {
    const out = filterSeriesByPeriod(series, '24h', now);
    expect(out.map((p) => p.v)).toEqual([130]);
  });
});
