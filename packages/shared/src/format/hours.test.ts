import { describe, expect, it } from 'vitest';
import { isOpenAt, openingStatus } from './hours';

// 2026-11-23 is a Monday. Karachi is UTC+5, so 05:00Z = 10:00 local.
const at = (isoLocal: string) => new Date(`${isoLocal}+05:00`);
const hours = [
  { weekday: 1, opens_at: '10:00:00', closes_at: '21:00:00' },
  { weekday: 5, opens_at: '10:00', closes_at: '12:30' },
  { weekday: 5, opens_at: '14:30', closes_at: '22:00' },
  { weekday: 6, opens_at: '18:00', closes_at: '02:00' },
];

describe('isOpenAt', () => {
  it('handles a normal day', () => {
    expect(isOpenAt(hours, at('2026-11-23T10:00'))).toBe(true);
    expect(isOpenAt(hours, at('2026-11-23T09:59'))).toBe(false);
    expect(isOpenAt(hours, at('2026-11-23T21:00'))).toBe(false);
  });
  it('is closed on days without hours and in a split-day break', () => {
    expect(isOpenAt(hours, at('2026-11-24T12:00'))).toBe(false);
    expect(isOpenAt(hours, at('2026-11-27T13:00'))).toBe(false);
    expect(isOpenAt(hours, at('2026-11-27T15:00'))).toBe(true);
  });
  it('runs past midnight', () => {
    expect(isOpenAt(hours, at('2026-11-28T23:30'))).toBe(true);
    expect(isOpenAt(hours, at('2026-11-29T01:30'))).toBe(true);
    expect(isOpenAt(hours, at('2026-11-29T02:30'))).toBe(false);
  });
});

describe('openingStatus', () => {
  it('labels open, closed and unknown', () => {
    expect(openingStatus(hours, at('2026-11-23T12:00'))?.label).toBe('Open now');
    expect(openingStatus(hours, at('2026-11-24T12:00'))?.label).toBe('Closed');
    expect(openingStatus([], at('2026-11-23T12:00'))).toBeNull();
  });
});
