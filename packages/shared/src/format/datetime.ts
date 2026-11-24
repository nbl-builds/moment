import { DEFAULT_TIMEZONE } from '../constants';

// Date and time helpers that render in the business's timezone (Asia/Karachi
// by default), not the device's. Timestamps from the API are ISO strings in UTC.
// Output is built from numeric parts so it is identical on Hermes, browsers and Node.

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DateInput = string | number | Date;

export interface ZonedParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** 0-23 */
  hour: number;
  minute: number;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

const toDate = (input: DateInput): Date => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid date: ${String(input)}`);
  return date;
};

/** Wall-clock parts of an instant in a timezone. */
export function getZonedParts(input: DateInput, timeZone: string = DEFAULT_TIMEZONE): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(toDate(input));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    year,
    month,
    day,
    hour: get('hour') % 24, // some engines emit "24" at midnight
    minute: get('minute'),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "1/1/2023 - 9:00PM": date and time of an instant in a timezone, as on the
 * Bucket List rows (Figma 24:2071).
 */
export function formatShortDateTime(input: DateInput, timeZone: string = DEFAULT_TIMEZONE): string {
  const { year, month, day, hour, minute } = getZonedParts(input, timeZone);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${month}/${day}/${year} - ${h12}:${pad(minute)}${hour < 12 ? 'AM' : 'PM'}`;
}

/** Calendar date ("YYYY-MM-DD") of an instant in a timezone. Use for `get_available_times(p_date)`. */
export function toLocalDate(input: DateInput, timeZone: string = DEFAULT_TIMEZONE): string {
  const { year, month, day } = getZonedParts(input, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** True for a real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isValidLocalDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/**
 * Converts a wall-clock date and time in a timezone to a UTC ISO string.
 * localDateTimeToIso('2026-11-20', '15:00') -> '2026-11-20T10:00:00.000Z' (Karachi is UTC+5)
 */
export function localDateTimeToIso(date: string, time: string, timeZone: string = DEFAULT_TIMEZONE): string {
  const dm = DATE_RE.exec(date);
  const tm = TIME_RE.exec(time);
  if (!dm || !tm || !isValidLocalDate(date)) throw new RangeError(`Invalid local date/time: ${date} ${time}`);
  const wall = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  // Offset of the zone at that wall time; repeat once to settle across DST jumps.
  let utc = wall - zoneOffsetMs(wall, timeZone);
  utc = wall - zoneOffsetMs(utc, timeZone);
  return new Date(utc).toISOString();
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const p = getZonedParts(utcMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(utcMs / 60000) * 60000;
}

/** Adds days to a "YYYY-MM-DD" date. */
export function addDaysToLocalDate(date: string, days: number): string {
  const m = DATE_RE.exec(date);
  if (!m || !isValidLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The next `count` calendar days starting today in the timezone, for the "Select Date" strip. */
export function upcomingLocalDates(
  count: number,
  timeZone: string = DEFAULT_TIMEZONE,
  from: DateInput = Date.now(),
): string[] {
  const start = toLocalDate(from, timeZone);
  return Array.from({ length: count }, (_, i) => addDaysToLocalDate(start, i));
}

/** "3 PM", "3:30 PM". */
export function formatTime(input: DateInput, timeZone: string = DEFAULT_TIMEZONE): string {
  const { hour, minute } = getZonedParts(input, timeZone);
  return formatClock(hour, minute);
}

/** Formats a "HH:mm[:ss]" wall-clock string (schedules, availability rules): "09:30" -> "9:30 AM". */
export function formatTimeOfDay(time: string): string {
  const m = TIME_RE.exec(time);
  if (!m) throw new RangeError(`Invalid time: ${time}`);
  return formatClock(Number(m[1]), Number(m[2]));
}

function formatClock(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${h12} ${period}` : `${h12}:${pad(minute)} ${period}`;
}

/** "3 PM to 4 PM". */
export function formatTimeRange(start: DateInput, end: DateInput, timeZone: string = DEFAULT_TIMEZONE): string {
  return `${formatTime(start, timeZone)} to ${formatTime(end, timeZone)}`;
}

export interface FormatDateOptions {
  timeZone?: string;
  /** `long` -> "Tuesday, Jan 24, 2026", `short` -> "Jan 24", `medium` -> "Jan 24, 2026". Default `long`. */
  style?: 'long' | 'medium' | 'short';
}

export function formatDate(input: DateInput, options: FormatDateOptions = {}): string {
  const { timeZone = DEFAULT_TIMEZONE, style = 'long' } = options;
  const p = getZonedParts(input, timeZone);
  return formatParts(p.year, p.month, p.day, p.weekday, style);
}

/** Formats a "YYYY-MM-DD" date without any timezone shifting (dates of birth, group trip dates). */
export function formatLocalDate(date: string, style: FormatDateOptions['style'] = 'medium'): string {
  const m = DATE_RE.exec(date);
  if (!m || !isValidLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return formatParts(y, mo, d, new Date(Date.UTC(y, mo - 1, d)).getUTCDay(), style);
}

function formatParts(year: number, month: number, day: number, weekday: number, style: FormatDateOptions['style']) {
  const monthName = MONTHS[month - 1] ?? '';
  if (style === 'short') return `${monthName} ${day}`;
  if (style === 'medium') return `${monthName} ${day}, ${year}`;
  return `${WEEKDAYS[weekday] ?? ''}, ${monthName} ${day}, ${year}`;
}

/** Booking summary line: "3 PM to 4 PM Tuesday, Jan 24, 2026" (Confirm & Pay screen). */
export function formatReservationTime(start: DateInput, end: DateInput, timeZone: string = DEFAULT_TIMEZONE): string {
  return `${formatTimeRange(start, end, timeZone)} ${formatDate(start, { timeZone })}`;
}

/** 90 -> "1h 30m", 45 -> "45m", 120 -> "2h", 1500 -> "1d 1h". */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) throw new RangeError(`Invalid duration: ${minutes}`);
  const total = Math.round(minutes);
  if (total === 0) return '0m';
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(' ');
}

/** Whole years between a "YYYY-MM-DD" birth date and `today` (defaults to now in Karachi). */
export function ageOn(dateOfBirth: string, today: string = toLocalDate(Date.now())): number {
  const b = DATE_RE.exec(dateOfBirth);
  const t = DATE_RE.exec(today);
  if (!b || !t) throw new RangeError(`Invalid date: ${dateOfBirth}`);
  const [by, bm, bd] = [Number(b[1]), Number(b[2]), Number(b[3])];
  const [ty, tm, td] = [Number(t[1]), Number(t[2]), Number(t[3])];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
