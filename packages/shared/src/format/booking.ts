import { BOOKING_CHARGES, CANCELLATION_POLICIES, DEFAULT_TIMEZONE, type CancellationPolicyKey } from '../constants';
import { getZonedParts, type DateInput } from './datetime';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "4 PM", "10:30 AM" in a timezone. */
export function formatHour(input: DateInput, timeZone: string = DEFAULT_TIMEZONE): string {
  const { hour, minute } = getZonedParts(input, timeZone);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * Price Details on Confirm Reservation: the server's subtotal and coupon
 * discount, plus tax and the service fee from BOOKING_CHARGES.
 * Tax is on the discounted amount; amounts in minor units.
 */
export function priceBreakdown(subtotal: number, discount = 0) {
  const discounted = Math.max(0, subtotal - discount);
  const tax = Math.round((discounted * BOOKING_CHARGES.taxPercent) / 100);
  const serviceFee = subtotal > 0 ? BOOKING_CHARGES.serviceFeeAmount : 0;
  return { subtotal, discount, tax, serviceFee, total: discounted + tax + serviceFee };
}

/**
 * Refund note under a slot ("Select dates"): when free cancellation ends, in
 * Pakistan time. "Free cancellation before 4 PM on 27 Nov (PKT)".
 */
export function refundNote(policy: CancellationPolicyKey, startsAt: DateInput, timeZone: string = DEFAULT_TIMEZONE, now: DateInput = Date.now()) {
  const rule = CANCELLATION_POLICIES[policy];
  if (rule.freeUntilHours === null) return 'Non-refundable once booked.';
  const start = new Date(startsAt).getTime();
  const deadline = start - rule.freeUntilHours * 3_600_000;
  if (deadline <= new Date(now).getTime()) return 'Non-refundable: free cancellation has ended for this time.';
  const { day, month } = getZonedParts(deadline, timeZone);
  return `Free cancellation before ${formatHour(deadline, timeZone)} on ${day} ${MONTHS[month - 1]} (PKT). After that, non-refundable.`;
}
