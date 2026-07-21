import { describe, it, expect } from 'vitest';
import { relativeTime } from './relativeTime';

const now = 1_000_000_000_000;
const ago = (ms: number) => relativeTime(now - ms, now);

describe('relativeTime', () => {
  it('shows "just now" for very recent times', () => {
    expect(ago(0)).toBe('just now');
    expect(ago(5_000)).toBe('just now');
  });

  it('shows seconds, minutes, hours and days', () => {
    expect(ago(30_000)).toBe('30s ago');
    expect(ago(5 * 60_000)).toBe('5m ago');
    expect(ago(3 * 3_600_000)).toBe('3h ago');
    expect(ago(2 * 86_400_000)).toBe('2d ago');
  });

  it('returns empty string for a missing timestamp', () => {
    expect(relativeTime(0, now)).toBe('');
    expect(relativeTime(undefined, now)).toBe('');
  });
});
