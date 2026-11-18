import { DEFAULT_TIMEZONE } from '../constants';
import { addDaysToLocalDate, localDateTimeToIso } from '../format/datetime';
import type { Enums } from '../types';
import { toCreateBookingArgs, type CancelBooking, type CreateBookingForm } from '../validation/booking';
import type { PageOptions } from './catalog';
import { requireUserId, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

// Booking flow and Bookings list. All writes go through RPCs (`create_booking`,
// `cancel_booking`, `update_booking_status`), which price, lock and validate on
// the server. The same calls serve the app, web, portal and POS (`source`).

export const BOOKING_LIST_SELECT = `
  id, code, status, payment_status, starts_at, ends_at, guest_count, total_amount, currency, source,
  listing:listings!inner(id, slug, title, type, duration_minutes, media:listing_media(url, alt, sort_order)),
  business:businesses!inner(id, slug, name, logo_url, timezone)
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
            review:reviews(id, rating, body, created_at)`,
          )
          .eq('id', bookingId)
          .maybeSingle(),
        'Booking',
      ),

    getByCode: (code: string) =>
      unwrapRequired(db.from('bookings').select(BOOKING_LIST_SELECT).eq('code', code.toUpperCase()).maybeSingle(), 'Booking'),
  };
}
