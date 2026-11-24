import { describe, expect, it } from 'vitest';
import {
  formatShortDateTime,
  addDaysToLocalDate,
  ageOn,
  formatDate,
  formatDuration,
  formatLocalDate,
  formatReservationTime,
  formatTime,
  formatTimeOfDay,
  formatTimeRange,
  getZonedParts,
  isValidLocalDate,
  localDateTimeToIso,
  toLocalDate,
  upcomingLocalDates,
} from './datetime';

// 2026-01-24 10:00 UTC = 3 PM in Karachi (UTC+5, no DST).
const THREE_PM_KARACHI = '2026-01-24T10:00:00Z';
const FOUR_PM_KARACHI = '2026-01-24T11:00:00Z';

describe('timezone conversion', () => {
  it('reads wall-clock parts in Karachi', () => {
    expect(getZonedParts(THREE_PM_KARACHI)).toEqual({
      year: 2026,
      month: 1,
      day: 24,
      hour: 15,
      minute: 0,
      weekday: 6,
    });
  });

  it('uses the Karachi calendar date, not UTC', () => {
    // 21:00 UTC on the 24th is 02:00 on the 25th in Karachi.
    expect(toLocalDate('2026-01-24T21:00:00Z')).toBe('2026-01-25');
    expect(toLocalDate('2026-01-24T18:59:00Z')).toBe('2026-01-24');
  });

  it('converts local date and time to UTC', () => {
    expect(localDateTimeToIso('2026-01-24', '15:00')).toBe('2026-01-24T10:00:00.000Z');
    expect(localDateTimeToIso('2026-01-25', '00:00')).toBe('2026-01-24T19:00:00.000Z');
    expect(localDateTimeToIso('2026-01-24', '15:00:00')).toBe('2026-01-24T10:00:00.000Z');
  });

  it('handles timezones with DST', () => {
    // London is on BST (UTC+1) in July.
    expect(localDateTimeToIso('2026-07-01', '12:00', 'Europe/London')).toBe('2026-07-01T11:00:00.000Z');
    expect(localDateTimeToIso('2026-01-01', '12:00', 'Europe/London')).toBe('2026-01-01T12:00:00.000Z');
  });

  it('rejects invalid input', () => {
    expect(() => localDateTimeToIso('2026-02-30', '10:00')).toThrow(RangeError);
    expect(() => localDateTimeToIso('2026-01-24', '25:00')).toThrow(RangeError);
    expect(() => getZonedParts('not a date')).toThrow(RangeError);
  });
});

describe('local dates', () => {
  it('validates calendar dates', () => {
    expect(isValidLocalDate('2026-02-28')).toBe(true);
    expect(isValidLocalDate('2028-02-29')).toBe(true);
    expect(isValidLocalDate('2026-02-29')).toBe(false);
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(isValidLocalDate('24/01/2026')).toBe(false);
  });

  it('adds days across month and year ends', () => {
    expect(addDaysToLocalDate('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysToLocalDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToLocalDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('lists upcoming days from today in Karachi', () => {
    expect(upcomingLocalDates(3, 'Asia/Karachi', '2026-01-24T21:00:00Z')).toEqual([
      '2026-01-25',
      '2026-01-26',
      '2026-01-27',
    ]);
  });
});

describe('display formatting', () => {
  it('formats times', () => {
    expect(formatTime(THREE_PM_KARACHI)).toBe('3 PM');
    expect(formatTime('2026-01-24T04:30:00Z')).toBe('9:30 AM');
    expect(formatTime('2026-01-24T19:00:00Z')).toBe('12 AM');
    expect(formatTime('2026-01-24T07:05:00Z')).toBe('12:05 PM');
    expect(formatTimeOfDay('09:30:00')).toBe('9:30 AM');
    expect(formatTimeOfDay('18:00')).toBe('6 PM');
  });

  it('formats dates', () => {
    expect(formatDate(THREE_PM_KARACHI)).toBe('Saturday, Jan 24, 2026');
    expect(formatDate(THREE_PM_KARACHI, { style: 'short' })).toBe('Jan 24');
    expect(formatDate(THREE_PM_KARACHI, { style: 'medium' })).toBe('Jan 24, 2026');
    expect(formatLocalDate('1995-08-14')).toBe('Aug 14, 1995');
  });

  it('formats the Confirm & Pay reservation line', () => {
    expect(formatTimeRange(THREE_PM_KARACHI, FOUR_PM_KARACHI)).toBe('3 PM to 4 PM');
    expect(formatReservationTime(THREE_PM_KARACHI, FOUR_PM_KARACHI)).toBe('3 PM to 4 PM Saturday, Jan 24, 2026');
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(1500)).toBe('1d 1h');
    expect(formatDuration(0)).toBe('0m');
    expect(() => formatDuration(-1)).toThrow(RangeError);
  });

  it('computes age on a date', () => {
    expect(ageOn('2000-11-18', '2026-11-18')).toBe(26);
    expect(ageOn('2000-11-19', '2026-11-18')).toBe(25);
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
  });
});

describe('formatShortDateTime', () => {
  it('formats in Asia/Karachi as on the Bucket List rows', () => {
    // 16:00 UTC is 21:00 in Karachi (UTC+5).
    expect(formatShortDateTime('2023-01-01T16:00:00Z')).toBe('1/1/2023 - 9:00PM');
    expect(formatShortDateTime('2026-11-23T19:05:00Z')).toBe('11/24/2026 - 12:05AM');
  });
});
