import { z } from 'zod';
import { LIMITS } from '../constants';
import type { RpcArgs } from '../types';
import { isoDateTimeSchema, optionalPkPhoneSchema, optionalText, uuidSchema } from './common';

// Figma booking flow: "Edit Reservation" (services), "Eidt Day", "Eidt Slot",
// "Edit Guests", "Edit Notes", "Enter coupon", "Pyament Method", then
// "Confirm & Pay". Prices are always computed by `create_booking` on the server.

/** User notes leave room for the guest details line that `toCreateBookingArgs` appends. */
export const BOOKING_NOTES_MAX = LIMITS.bookingNotes - 100;

export interface GuestLimits {
  minGuests: number;
  maxGuests: number;
  /** Shows "Bringing a service animal?"; pets are never counted as guests. */
  allowServiceAnimals?: boolean;
}

const guestCounter = (label: string, min: number) =>
  z
    .number({ message: `${label} must be a number` })
    .int()
    .min(min, { message: min > 0 ? `At least ${min} ${label.toLowerCase()} required` : `${label} cannot be negative` })
    .max(99);

/** "Edit Guests": adults (13+), children (2-12), infants (under 2), pets. */
const guestsShape = z.object({
  adults: guestCounter('Adults', 1),
  children: guestCounter('Children', 0).default(0),
  infants: guestCounter('Infants', 0).default(0),
  pets: guestCounter('Pets', 0).default(0),
});

/** Guests that count toward capacity: infants and pets do not ("not including infants"). */
export const countGuests = (guests: { adults: number; children?: number }): number =>
  guests.adults + (guests.children ?? 0);

/** Guests picker schema for one listing's min/max. */
export function createGuestsSchema({ minGuests, maxGuests, allowServiceAnimals = true }: GuestLimits) {
  return guestsShape.superRefine((g, ctx) => {
    const count = countGuests(g);
    if (count > maxGuests) {
      ctx.addIssue({
        code: 'custom',
        path: ['adults'],
        message: `This place has a maximum of ${maxGuests} guests, not including infants`,
      });
    }
    if (count < minGuests) {
      ctx.addIssue({ code: 'custom', path: ['adults'], message: `This booking needs at least ${minGuests} guests` });
    }
    if (!allowServiceAnimals && g.pets > 0) {
      ctx.addIssue({ code: 'custom', path: ['pets'], message: 'Pets are not allowed here' });
    }
  });
}

export const guestsSchema = guestsShape;

/** "Edit Notes". */
export const bookingNotesSchema = z.object({ notes: optionalText(BOOKING_NOTES_MAX, 'Notes') });

/** Coupon code as typed on "Enter coupon". Matches `coupons.code` (case-insensitive). */
export const couponCodeSchema = z
  .string({ message: 'Enter a coupon code' })
  .trim()
  .min(LIMITS.couponCode.min, { message: 'Enter a valid coupon code' })
  .max(LIMITS.couponCode.max, { message: 'Enter a valid coupon code' })
  .regex(/^[A-Za-z0-9_-]+$/, { message: 'Coupon codes only use letters, numbers, - and _' })
  .toUpperCase();

export const applyCouponSchema = z.object({ code: couponCodeSchema });

/** "Edit Reservation": options (services) and quantities. */
export const bookingItemSchema = z.object({
  optionId: uuidSchema,
  quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }).max(99),
});

const bookingBase = z.object({
  listingId: uuidSchema,
  guests: guestsShape,
  items: z
    .array(bookingItemSchema)
    .max(20)
    .refine((items) => new Set(items.map((i) => i.optionId)).size === items.length, {
      message: 'Each service can only be added once',
    })
    .default([]),
  notes: optionalText(BOOKING_NOTES_MAX, 'Notes'),
  couponCode: couponCodeSchema.optional(),
  contactPhone: optionalPkPhoneSchema,
  groupId: uuidSchema.optional(),
  /** Generate once per checkout (e.g. `crypto.randomUUID()`) so retries never double-book. */
  idempotencyKey: z.string().min(8).max(100),
  source: z.enum(['app', 'web', 'portal', 'pos']).default('app'),
});

/**
 * Confirm & Pay. `mode` follows the listing's `booking_mode`:
 * `slot` (tours: pick a session) or `appointment` (services: pick a time, optionally a staff member).
 */
export const createBookingSchema = z.discriminatedUnion('mode', [
  bookingBase.extend({ mode: z.literal('slot'), slotId: uuidSchema }),
  bookingBase.extend({
    mode: z.literal('appointment'),
    startsAt: isoDateTimeSchema,
    staffId: uuidSchema.optional(),
  }),
]);

export type BookingGuests = z.output<typeof guestsShape>;
export type CreateBookingInput = z.input<typeof createBookingSchema>;
export type CreateBookingForm = z.output<typeof createBookingSchema>;

/** "Infants: 1. Service animal: 1." Added to the booking notes so the business sees it. */
export function guestDetailsNote(guests: Pick<BookingGuests, 'children' | 'infants' | 'pets'>): string | undefined {
  const parts: string[] = [];
  if (guests.children > 0) parts.push(`Children: ${guests.children}`);
  if (guests.infants > 0) parts.push(`Infants: ${guests.infants}`);
  if (guests.pets > 0) parts.push(`Service animals: ${guests.pets}`);
  return parts.length ? `${parts.join('. ')}.` : undefined;
}

/** Maps a validated booking form onto the `create_booking` RPC arguments. */
export function toCreateBookingArgs(form: CreateBookingForm): RpcArgs<'create_booking'> {
  const notes = [form.notes, guestDetailsNote(form.guests)].filter(Boolean).join('\n\n') || undefined;
  return {
    p_listing_id: form.listingId,
    p_guest_count: countGuests(form.guests),
    p_items: form.items.length ? form.items.map((i) => ({ option_id: i.optionId, quantity: i.quantity })) : undefined,
    p_notes: notes,
    p_coupon_code: form.couponCode,
    p_contact_phone: form.contactPhone,
    p_group_id: form.groupId,
    p_idempotency_key: form.idempotencyKey,
    p_source: form.source,
    ...(form.mode === 'slot'
      ? { p_slot_id: form.slotId }
      : { p_starts_at: form.startsAt, p_staff_id: form.staffId }),
  };
}

/** Cancelling a booking from "Booking Details". */
export const cancelBookingSchema = z.object({
  bookingId: uuidSchema,
  reason: optionalText(LIMITS.cancellationReason, 'Reason'),
});

export type CancelBooking = z.output<typeof cancelBookingSchema>;
