import { ApiError, createBookingSchema, createCartSchema, priceBreakdown, type PaymentMethodKey } from '@moment/shared';
import { api } from '@/lib/api';
import type { BookingDraft } from './draft';
import { applyForMembership, payForBookings } from './mock';
import type { SuccessKind } from './components/success-sheet';

export interface CheckoutResult {
  kind: SuccessKind;
  bookingIds: string[];
}

/** Why Confirm & Pay failed, and whether picking another time would help. */
export interface CheckoutError {
  message: string;
  /** The time or session was taken: offer to pick again. */
  repick: boolean;
}

/**
 * Confirm & Pay: books on the server (all or nothing, idempotent per
 * checkout), then takes payment through the payments mock. Request-to-book
 * bookings come back `pending`; instant ones `confirmed`.
 */
export async function submitCheckout(draft: BookingDraft, total: number, contactPhone: string | null): Promise<CheckoutResult> {
  const { item } = draft;
  const method = draft.paymentMethod as PaymentMethodKey;
  const phone = contactPhone ?? undefined;

  if (item.kind === 'membership') {
    await applyForMembership({ planId: item.planId, method, amount: total });
    return { kind: 'membership', bookingIds: [] };
  }

  let bookings: { id: string; status: string }[];
  if (item.kind === 'services') {
    if (!item.visit) throw new ApiError('invalid', 'Pick an appointment time first.');
    const form = createCartSchema.parse({
      services: item.visit.times.map((t) => ({ listingId: t.listingId, startsAt: t.startsAt, staffId: t.staffId })),
      notes: draft.notes || undefined,
      couponCode: draft.couponCode ?? undefined,
      contactPhone: phone,
      idempotencyKey: draft.idempotencyKey,
    });
    bookings = await api.bookings.createCart(form);
  } else {
    const form = createBookingSchema.parse({
      mode: 'slot',
      listingId: item.listingId,
      slotId: item.slotId,
      private: item.private,
      guests: draft.guests,
      notes: draft.notes || undefined,
      couponCode: draft.couponCode ?? undefined,
      contactPhone: phone,
      idempotencyKey: draft.idempotencyKey,
    });
    bookings = [await api.bookings.create(form)];
  }

  await payForBookings({ bookingIds: bookings.map((b) => b.id), amount: total, method });
  return {
    kind: bookings.some((b) => b.status === 'pending') ? 'request' : 'confirmed',
    bookingIds: bookings.map((b) => b.id),
  };
}

export function checkoutError(e: unknown, kind: BookingDraft['item']['kind']): CheckoutError {
  if (e instanceof ApiError && e.code === 'conflict') {
    const fallback = kind === 'services' ? 'This time is no longer available.' : 'This session just filled up.';
    const message = /only 0 seats/i.test(e.message) ? 'This session is sold out.' : e.message || fallback;
    return { message: `${message} Pick another ${kind === 'services' ? 'time' : 'session'}.`, repick: true };
  }
  if (e instanceof ApiError && e.code === 'invalid') return { message: e.message, repick: false };
  return { message: e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.', repick: false };
}

/** Total charged, as shown on Price Details. */
export const checkoutTotal = (subtotal: number, discount: number) => priceBreakdown(subtotal, discount).total;
