import { describe, it, expect, beforeEach } from 'vitest';
import { shouldAppend, appendSnapshot, getSnapshots, HOUR_MS } from './snapshot';

describe('shouldAppend', () => {
  it('appends when there is no prior point', () => {
    expect(shouldAppend(null, 1000)).toBe(true);
  });
  it('rejects within an hour of the last point', () => {
    expect(shouldAppend(1000, 1000 + HOUR_MS - 1)).toBe(false);
  });
  it('appends after an hour', () => {
    expect(shouldAppend(1000, 1000 + HOUR_MS)).toBe(true);
  });
});

describe('snapshot store (IndexedDB)', () => {
  beforeEach(async () => {
    const all = await getSnapshots();
    expect(Array.isArray(all)).toBe(true);
  });

  it('appends a point when enough time has passed and reads it back', async () => {
    await appendSnapshot(1234.5, 1000);
    await appendSnapshot(9999.9, 1000 + 10); // throttled away
    const series = await getSnapshots();
    expect(series).toEqual([{ t: 1000, v: 1234.5 }]);
  });
});
