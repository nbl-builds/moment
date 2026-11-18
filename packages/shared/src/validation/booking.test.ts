import { describe, expect, it } from 'vitest';
import {
  applyCouponSchema,
  bookingNotesSchema,
  cancelBookingSchema,
  countGuests,
  createBookingSchema,
  createGuestsSchema,
  guestDetailsNote,
  toCreateBookingArgs,
} from './booking';

const LISTING = '7b0c4a39-5d8e-4f7a-9b3c-2a1d0e6f8c45';
const SLOT = 'c2d9e8f1-3a4b-4c5d-8e6f-7a8b9c0d1e2f';
const OPTION = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const STAFF = 'f0e1d2c3-b4a5-4968-8776-655443322110';

describe('guests', () => {
  const schema = createGuestsSchema({ minGuests: 1, maxGuests: 6 });

  it('does not count infants or pets', () => {
    expect(countGuests({ adults: 2, children: 3 })).toBe(5);
    expect(schema.safeParse({ adults: 4, children: 2, infants: 3, pets: 1 }).success).toBe(true);
  });

  it('defaults optional counters', () => {
    expect(schema.parse({ adults: 2 })).toEqual({ adults: 2, children: 0, infants: 0, pets: 0 });
  });

  it('enforces the listing maximum with the Figma copy', () => {
    const result = schema.safeParse({ adults: 5, children: 2 });
    expect(result.error?.issues[0]?.message).toBe('This place has a maximum of 6 guests, not including infants');
  });

  it('enforces the listing minimum', () => {
    const groupOnly = createGuestsSchema({ minGuests: 4, maxGuests: 10 });
    expect(groupOnly.safeParse({ adults: 2, children: 1 }).error?.issues[0]?.message).toBe(
      'This booking needs at least 4 guests',
    );
  });

  it('requires an adult and can disallow pets', () => {
    expect(schema.safeParse({ adults: 0, children: 2 }).success).toBe(false);
    const noPets = createGuestsSchema({ minGuests: 1, maxGuests: 6, allowServiceAnimals: false });
    expect(noPets.safeParse({ adults: 1, pets: 1 }).error?.issues[0]?.path).toEqual(['pets']);
  });
});

describe('notes and coupons', () => {
  it('turns empty notes into undefined', () => {
    expect(bookingNotesSchema.parse({ notes: '   ' })).toEqual({ notes: undefined });
    expect(bookingNotesSchema.safeParse({ notes: 'x'.repeat(901) }).success).toBe(false);
  });

  it('normalises coupon codes like the database (case-insensitive)', () => {
    expect(applyCouponSchema.parse({ code: ' bloom10 ' })).toEqual({ code: 'BLOOM10' });
    expect(applyCouponSchema.safeParse({ code: 'AB' }).success).toBe(false);
    expect(applyCouponSchema.safeParse({ code: 'BLOOM 10' }).success).toBe(false);
  });
});

describe('createBookingSchema', () => {
  const base = { listingId: LISTING, guests: { adults: 2 }, idempotencyKey: 'checkout-123456' };

  it('parses a slot booking', () => {
    const form = createBookingSchema.parse({ ...base, mode: 'slot', slotId: SLOT });
    expect(form).toMatchObject({ mode: 'slot', slotId: SLOT, items: [], source: 'app' });
  });

  it('parses an appointment booking', () => {
    const form = createBookingSchema.parse({
      ...base,
      mode: 'appointment',
      startsAt: '2026-11-20T10:00:00Z',
      staffId: STAFF,
      items: [{ optionId: OPTION, quantity: 1 }],
    });
    expect(form.mode).toBe('appointment');
  });

  it('requires the right time field for the mode', () => {
    expect(createBookingSchema.safeParse({ ...base, mode: 'slot' }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, mode: 'appointment', slotId: SLOT }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, mode: 'appointment', startsAt: '20 Nov 3pm' }).success).toBe(false);
  });

  it('rejects duplicate services and missing idempotency keys', () => {
    const duplicate = createBookingSchema.safeParse({
      ...base,
      mode: 'slot',
      slotId: SLOT,
      items: [
        { optionId: OPTION, quantity: 1 },
        { optionId: OPTION, quantity: 2 },
      ],
    });
    expect(duplicate.error?.issues[0]?.message).toBe('Each service can only be added once');
    const { idempotencyKey: _omit, ...withoutKey } = base;
    expect(createBookingSchema.safeParse({ ...withoutKey, mode: 'slot', slotId: SLOT }).success).toBe(false);
  });
});

describe('toCreateBookingArgs', () => {
  it('maps a slot booking onto the RPC', () => {
    const form = createBookingSchema.parse({
      listingId: LISTING,
      mode: 'slot',
      slotId: SLOT,
      guests: { adults: 2, children: 1, infants: 1 },
      notes: 'Vegetarian lunch please',
      couponCode: 'bloom10',
      contactPhone: '0300 1234567',
      idempotencyKey: 'checkout-123456',
    });
    expect(toCreateBookingArgs(form)).toEqual({
      p_listing_id: LISTING,
      p_slot_id: SLOT,
      p_guest_count: 3,
      p_items: undefined,
      p_notes: 'Vegetarian lunch please\n\nChildren: 1. Infants: 1.',
      p_coupon_code: 'BLOOM10',
      p_contact_phone: '+923001234567',
      p_group_id: undefined,
      p_idempotency_key: 'checkout-123456',
      p_source: 'app',
    });
  });

  it('maps an appointment booking with services', () => {
    const form = createBookingSchema.parse({
      listingId: LISTING,
      mode: 'appointment',
      startsAt: '2026-11-20T10:00:00Z',
      staffId: STAFF,
      guests: { adults: 1 },
      items: [{ optionId: OPTION, quantity: 2 }],
      idempotencyKey: 'checkout-abcdef',
      source: 'pos',
    });
    expect(toCreateBookingArgs(form)).toMatchObject({
      p_starts_at: '2026-11-20T10:00:00Z',
      p_staff_id: STAFF,
      p_guest_count: 1,
      p_items: [{ option_id: OPTION, quantity: 2 }],
      p_notes: undefined,
      p_source: 'pos',
    });
  });

  it('summarises extra guests', () => {
    expect(guestDetailsNote({ children: 0, infants: 0, pets: 0 })).toBeUndefined();
    expect(guestDetailsNote({ children: 0, infants: 2, pets: 1 })).toBe('Infants: 2. Service animals: 1.');
  });
});

describe('cancelBookingSchema', () => {
  it('accepts an optional reason', () => {
    expect(cancelBookingSchema.parse({ bookingId: LISTING, reason: '' })).toEqual({ bookingId: LISTING, reason: undefined });
    expect(cancelBookingSchema.safeParse({ bookingId: 'nope' }).success).toBe(false);
  });
});
