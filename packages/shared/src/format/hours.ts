import { DEFAULT_TIMEZONE } from '../constants';
import { getZonedParts, type DateInput } from './datetime';

/**
 * Opening hours ("Open now" / "Closed" on the business page). Mirrors the SQL
 * function `business_is_open`: periods are wall-clock times in the business's
 * timezone, 0 = Sunday, and a period whose close is not after its open runs
 * past midnight into the next day.
 */
export interface OpeningPeriod {
  weekday: number;
  /** "HH:MM" or "HH:MM:SS". */
  opens_at: string;
  closes_at: string;
}

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function isOpenAt(hours: OpeningPeriod[], at: DateInput = Date.now(), timeZone: string = DEFAULT_TIMEZONE): boolean {
  const { weekday, hour, minute } = getZonedParts(at, timeZone);
  const now = hour * 60 + minute;
  const yesterday = (weekday + 6) % 7;
  return hours.some((p) => {
    const open = minutes(p.opens_at);
    const close = minutes(p.closes_at);
    if (close > open) return p.weekday === weekday && now >= open && now < close;
    return (p.weekday === weekday && now >= open) || (p.weekday === yesterday && now < close);
  });
}

/** "Open now" or "Closed"; null when the business has no hours listed. */
export function openingStatus(hours: OpeningPeriod[], at: DateInput = Date.now(), timeZone: string = DEFAULT_TIMEZONE) {
  if (hours.length === 0) return null;
  const open = isOpenAt(hours, at, timeZone);
  return { open, label: open ? 'Open now' : 'Closed' } as const;
}
