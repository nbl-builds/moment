import { formatHour, getZonedParts, type DateInput } from '@moment/shared';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sat, 14 Dec" (Pakistan time). */
export function shortDay(input: DateInput): string {
  const p = getZonedParts(input);
  return `${DAYS[p.weekday]}, ${p.day} ${MONTHS[p.month - 1]}`;
}

/** "3 PM to 4 PM" (Pakistan time). */
export function hourRange(start: DateInput, end: DateInput): string {
  return `${formatHour(start)} to ${formatHour(end)}`;
}

/** "Tuesday, 24 Nov 2026, 3 PM to 4 PM" (Appointment Time on Confirm). */
export function appointmentLine(start: DateInput, end: DateInput): string {
  const p = getZonedParts(start);
  return `${LONG_DAYS[p.weekday]}, ${p.day} ${MONTHS[p.month - 1]} ${p.year}, ${hourRange(start, end)}`;
}
