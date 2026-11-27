import { DEFAULT_TIMEZONE } from '../constants';
import { addDaysToLocalDate, localDateTimeToIso } from '../format/datetime';
import type { Enums } from '../types';
import { toCreateBookingArgs, type CancelBooking, type CreateBookingForm, type CreateCartForm } from '../validation/booking';
import type { PageOptions } from './catalog';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { requireUserId, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

// Booking flow and Bookings list. All writes go through RPCs (`create_booking`,
// `cancel_booking`, `update_booking_status`), which price, lock and validate on
// the server. The same calls serve the app, web, portal and POS (`source`).

export const BOOKING_LIST_SELECT = `
  id, code, status, payment_status, starts_at, ends_at, guest_count, total_amount, currency, source,
  listing:listings!inner(id, slug, title, type, duration_minutes, media:listing_media(url, alt, sort_order)),
  business:businesses!inner(id, slug, name, logo_url, cover_url, timezone, is_verified, rating_avg, rating_count),
  location:business_locations(area, city)
` as const;

export const UPCOMING_STATUSES: Enums<'booking_status'>[] = ['pending', 'confirmed'];
export const PAST_STATUSES: Enums<'booking_status'>[] = [
  'completed',
  'cancelled_by_consumer',
  'cancelled_by_business',
  'no_show',
];

export function createBookingsApi(db: MomentSupabaseClient) {
  return {
    /** "Select Date" + "Edit Slot" for slot-mode listings: open sessions on a local day. */
    listSlots: ({ listingId, date, timeZone = DEFAULT_TIMEZONE }: { listingId: string; date: string; timeZone?: string }) =>
      unwrap(
        db
          .from('slots')
          .select('id, starts_at, ends_at, capacity, seats_booked, status, staff_id')
          .eq('listing_id', listingId)
          .eq('status', 'open')
          .gte('starts_at', localDateTimeToIso(date, '00:00', timeZone))
          .lt('starts_at', localDateTimeToIso(addDaysToLocalDate(date, 1), '00:00', timeZone))
          .gt('starts_at', new Date().toISOString())
          .order('starts_at'),
      ),

    /** "Edit Slot" for appointment-mode listings: free times from staff schedules. */
    listAvailableTimes: ({
      listingId,
      date,
      optionId,
      staffId,
    }: {
      listingId: string;
      date: string;
      optionId?: string;
      staffId?: string;
    }) =>
      unwrap(
        db.rpc('get_available_times', { p_listing_id: listingId, p_date: date, p_option_id: optionId, p_staff_id: staffId }),
      ),

    /** Confirm & Pay. Pass the output of `createBookingSchema`. Retrying with the same idempotency key is safe. */
    create: (form: CreateBookingForm) => unwrap(db.rpc('create_booking', toCreateBookingArgs(form))),

    /**
     * Confirm & Pay for a services cart: one booking per service, all or none.
     * The coupon applies to the most expensive service. Idempotent per key.
     */
    createCart: (form: CreateCartForm) =>
      unwrap(
        db.rpc('create_bookings', {
          p_bookings: form.services.map((s) => ({
            listing_id: s.listingId,
            starts_at: s.startsAt,
            staff_id: s.staffId ?? null,
            ...(s.optionId ? { items: [{ option_id: s.optionId, quantity: 1 }] } : null),
          })),
          p_coupon_code: form.couponCode,
          p_notes: form.notes,
          p_idempotency_key: form.idempotencyKey,
          p_contact_phone: form.contactPhone,
        }),
      ),

    /**
     * Price lines for Confirm Reservation, priced by the server exactly as the
     * booking will be. A bad coupon doesn't throw: `coupon_error` says why.
     */
    quote: async (args: { listingId: string; guestCount?: number; optionId?: string; couponCode?: string; private?: boolean; startsAt?: string }) => {
      const data = await unwrap(
        db.rpc('quote_booking', {
          p_listing_id: args.listingId,
          p_guest_count: args.guestCount ?? 1,
          p_items: args.optionId ? [{ option_id: args.optionId, quantity: 1 }] : undefined,
          p_coupon_code: args.couponCode,
          p_private: args.private ?? false,
          p_starts_at: args.startsAt,
        }),
      );
      const q = data as {
        subtotal: number;
        offer_discount: number;
        offer_label: string | null;
        discount: number;
        total: number;
        currency: string;
        coupon_title: string | null;
        coupon_error: string | null;
      };
      return {
        subtotal: q.subtotal,
        /** The listing's own discount (large group or early bird), before the coupon. */
        offerDiscount: q.offer_discount ?? 0,
        offerLabel: q.offer_label,
        /** Coupon discount. */
        discount: q.discount,
        total: q.total,
        currency: q.currency,
        couponTitle: q.coupon_title,
        couponError: q.coupon_error,
      };
    },

    /** "Select Date" for appointments: local dates with at least one free time. */
    availableDates: async ({ listingId, from, to }: { listingId: string; from: string; to: string }) =>
      new Set(await unwrap(db.rpc('available_dates', { p_listing_id: listingId, p_from: from, p_to: to }))),

    /** "Select dates" for experiences: the next sessions with their host and seats left. */
    upcomingSlots: ({ listingId, days = 21 }: { listingId: string; days?: number }) =>
      unwrap(
        db
          .from('slots')
          .select('id, starts_at, ends_at, capacity, seats_booked, status, staff:staff_members(id, display_name, avatar_url)')
          .eq('listing_id', listingId)
          .in('status', ['open', 'full'])
          .gt('starts_at', new Date().toISOString())
          .lt('starts_at', new Date(Date.now() + days * 86_400_000).toISOString())
          .order('starts_at'),
      ),

    /** "Available Coupons" on Add Coupon: public deals for this business or all of Moment. */
    publicCoupons: (businessId: string) =>
      unwrap(
        db
          .from('coupons')
          .select('id, code, title, description, discount_type, discount_value, max_discount_amount, min_subtotal_amount, ends_at, business_id')
          .eq('is_public', true)
          .or(`business_id.is.null,business_id.eq.${businessId}`)
          .order('business_id', { nullsFirst: false }),
      ),

    cancel: ({ bookingId, reason }: CancelBooking) =>
      unwrap(db.rpc('cancel_booking', { p_booking_id: bookingId, p_reason: reason })),

    /** Bookings screen. `upcoming` = pending/confirmed and not yet ended; `past` = everything else. */
    listMine: async ({ when = 'upcoming', ...page }: { when?: 'upcoming' | 'past' | 'all' } & PageOptions = {}) => {
      const userId = await requireUserId(db);
      const { limit = 20, offset = 0 } = page;
      const now = new Date().toISOString();
      let q = db.from('bookings').select(BOOKING_LIST_SELECT).eq('consumer_id', userId);
      if (when === 'upcoming') q = q.in('status', UPCOMING_STATUSES).gte('ends_at', now);
      if (when === 'past') q = q.or(`status.in.(${PAST_STATUSES.join(',')}),ends_at.lt.${now}`);
      return unwrap(
        q.order('starts_at', { ascending: when === 'upcoming' }).range(offset, offset + limit - 1),
      );
    },

    /** Booking Details: lines, status history, review and payments. */
    get: (bookingId: string) =>
      unwrapRequired(
        db
          .from('bookings')
          .select(
            `*,
            listing:listings!inner(id, slug, title, type, booking_mode, duration_minutes, cancellation_policy, meeting_point_notes,
              media:listing_media(url, alt, sort_order)),
            business:businesses!inner(id, slug, name, logo_url, phone, timezone),
            location:business_locations(id, name, address_line1, address_line2, area, city),
            staff:staff_members(id, display_name, avatar_url, title),
            items:booking_items(id, option_id, name, quantity, unit_amount, total_amount),
            events:booking_events(id, from_status, to_status, note, created_at),
            review:reviews(id, rating, body, created_at),
            payments:payments(id, method, method_summary, provider, status, amount, created_at)`,
          )
          .eq('id', bookingId)
          .maybeSingle(),
        'Booking',
      ),

    /** Bookings tab badges: unread messages per business conversation (signed-in user). */
    unreadByBusiness: () => unwrap(db.rpc('my_business_unread')),

    /**
     * Live updates for the signed-in user on the private `user:<id>` channel:
     * `booking` when one of my bookings changes status or time, `message` when
     * someone else writes in one of my conversations. Returns an unsubscribe function.
     */
    subscribeMine: (
      userId: string,
      on: {
        booking?: (e: { booking_id: string; business_id: string; status: Enums<'booking_status'>; starts_at: string }) => void;
        message?: (e: { conversation_id: string; business_id: string | null; message_id: string }) => void;
      },
    ): (() => void) => {
      let channel: RealtimeChannel | undefined;
      let closed = false;
      void db.realtime.setAuth().then(() => {
        if (closed) return;
        channel = db
          .channel(`user:${userId}`, { config: { private: true } })
          .on('broadcast', { event: 'booking' }, ({ payload }) => on.booking?.(payload as never))
          .on('broadcast', { event: 'message' }, ({ payload }) => on.message?.(payload as never))
          .subscribe();
      });
      return () => {
        closed = true;
        if (channel) void db.removeChannel(channel);
      };
    },

    getByCode: (code: string) =>
      unwrapRequired(db.from('bookings').select(BOOKING_LIST_SELECT).eq('code', code.toUpperCase()).maybeSingle(), 'Booking'),
  };
}
