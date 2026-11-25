import { getZonedParts } from '@moment/shared';

/** "01:10 PM" in Pakistan time (Chat 47:5940). */
export function messageTime(iso: string): string {
  const { hour, minute } = getZonedParts(iso);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Day separator: "Today", "Yesterday", "24 Nov". */
export function messageDay(iso: string, now = Date.now()): string {
  const d = getZonedParts(iso);
  const t = getZonedParts(now);
  const days = Math.round((Date.UTC(t.year, t.month - 1, t.day) - Date.UTC(d.year, d.month - 1, d.day)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${d.day} ${MONTHS[d.month - 1]}${d.year !== t.year ? ` ${d.year}` : ''}`;
}

export const dayKey = (iso: string) => {
  const d = getZonedParts(iso);
  return `${d.year}-${d.month}-${d.day}`;
};
