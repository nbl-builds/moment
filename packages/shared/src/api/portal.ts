import { DEFAULT_TIMEZONE } from '../constants';
import { addDaysToLocalDate, localDateTimeToIso, toLocalDate } from '../format/datetime';
import type { Enums } from '../types';
import { requireUserId, unwrap, type MomentSupabaseClient } from './errors';

// Business portal reads and actions (Dashboard, Calendar, Inbox, Listings,
// Insights, Reviews). Every query is scoped by business_id; RLS enforces it.

/** Dashboard tabs (Figma 209:929), in display order. */
export const RESERVATION_TABS = ['ongoing', 'upcoming', 'pending', 'cancelled', 'completed'] as const;
export type ReservationTab = (typeof RESERVATION_TABS)[number];

export const RESERVATION_TAB_LABELS: Record<ReservationTab, string> = {
  ongoing: 'Ongoing',
  upcoming: 'Upcoming',
  pending: 'Pending',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

/**
 * What each tab holds (times in the business's timezone):
 * - Ongoing: confirmed and starting today, plus earlier ones not closed yet
 *   (still to mark completed or no-show).
 * - Upcoming: confirmed, starting after today.
 * - Pending: waiting for the business to accept or decline.
 * - Cancelled: by the guest or the business.
 * - Completed: completed and no-shows.
 */
export const RESERVATION_TAB_STATUSES: Record<ReservationTab, Enums<'booking_status'>[]> = {
  ongoing: ['confirmed'],
  upcoming: ['confirmed'],
  pending: ['pending'],
  cancelled: ['cancelled_by_consumer', 'cancelled_by_business'],
  completed: ['completed', 'no_show'],
};

/** Start of tomorrow in the timezone, as ISO (the Ongoing / Upcoming boundary). */
export function endOfLocalToday(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  return localDateTimeToIso(addDaysToLocalDate(toLocalDate(now, timeZone), 1), '00:00', timeZone);
}

export const RESERVATION_ROW_SELECT = `
  id, code, status, payment_status, starts_at, ends_at, guest_count, total_amount, currency, created_at, cancelled_at,
  listing:listings!inner(id, title, city, media:listing_media(url, sort_order)),
  guest:profiles!bookings_consumer_id_fkey(id, display_name, avatar_url, home_city),
  location:business_locations(address_line1, area, city)
` as const;

export const PORTAL_LISTING_SELECT = `
  id, title, status, type, city, published_at, updated_at, created_at, price_amount, price_unit,
  category:categories(id, slug, name, parent:parent_id(id, slug, name)),
  media:listing_media(url, sort_order)
` as const;

export type ListingTab = 'published' | 'draft' | 'archived';

export type InsightsPeriod = 'weekly' | 'monthly' | 'yearly';

export interface InsightsSeries {
  series: { start: string; value: number }[];
  total: number;
  previous: number;
}

export interface BusinessInsights {
  period: InsightsPeriod;
  from: string;
  timezone: string;
  bookings: InsightsSeries;
  views: InsightsSeries;
  /** Owners only; null for managers and staff. */
  revenue: InsightsSeries | null;
  /** Owners only; null for managers and staff. Minor units. */
  wallet: { balance: number; currency: string } | null;
  rating: { average: number; count: number; trend: { month: string; average: number }[] };
  categories: { slug: string; name: string; count: number }[];
  newly_added: { id: string; title: string; city: string; views: number; published_at: string | null; cover: string | null }[];
  most_viewed: { id: string; title: string; city: string; views: number; cover: string | null }[];
}

export function createPortalApi(db: MomentSupabaseClient) {
  /** Applies a tab's filters to any bookings query. */
  function forTab<Q extends { eq: (c: string, v: string) => Q; in: (c: string, v: string[]) => Q; lt: (c: string, v: string) => Q; gte: (c: string, v: string) => Q }>(
    q: Q,
    businessId: string,
    tab: ReservationTab,
    opts: { listingId?: string; timeZone?: string },
  ): Q {
    const boundary = endOfLocalToday(opts.timeZone);
    let out = q.eq('business_id', businessId).in('status', RESERVATION_TAB_STATUSES[tab]);
    if (opts.listingId) out = out.eq('listing_id', opts.listingId);
    if (tab === 'ongoing') out = out.lt('starts_at', boundary);
    if (tab === 'upcoming') out = out.gte('starts_at', boundary);
    return out;
  }

  return {
    /** Counts per dashboard tab ("Ongoing (3)"). */
    reservationCounts: async (businessId: string, opts: { listingId?: string; timeZone?: string } = {}) => {
      const entries = await Promise.all(
        RESERVATION_TABS.map(async (tab) => {
          const { count, error } = await forTab(
            db.from('bookings').select('id', { count: 'exact', head: true }),
            businessId,
            tab,
            opts,
          );
          if (error) throw error;
          return [tab, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<ReservationTab, number>;
    },

    /** Rows for one tab: soonest first for live tabs, newest first for past ones. */
    listReservations: (
      businessId: string,
      tab: ReservationTab,
      { listingId, timeZone, limit = 50, offset = 0 }: { listingId?: string; timeZone?: string; limit?: number; offset?: number } = {},
    ) => {
      const q = forTab(db.from('bookings').select(RESERVATION_ROW_SELECT), businessId, tab, { listingId, timeZone });
      const ordered =
        tab === 'cancelled'
          ? q.order('cancelled_at', { ascending: false, nullsFirst: false })
          : tab === 'completed'
            ? q.order('starts_at', { ascending: false })
            : q.order('starts_at', { ascending: true });
      return unwrap(ordered.range(offset, offset + limit - 1));
    },

    /** Calendar: reservations starting in [from, to) that aren't cancelled. */
    reservationsBetween: (businessId: string, from: string, to: string) =>
      unwrap(
        db
          .from('bookings')
          .select(RESERVATION_ROW_SELECT)
          .eq('business_id', businessId)
          .gte('starts_at', from)
          .lt('starts_at', to)
          .not('status', 'in', '(cancelled_by_consumer,cancelled_by_business)')
          .order('starts_at'),
      ),

    /** Everything the reservation panel shows. */
    getReservation: async (bookingId: string) => {
      const booking = await unwrap(
        db
          .from('bookings')
          .select(
            `id, code, business_id, status, payment_status, starts_at, ends_at, guest_count, notes, source,
            contact_name, contact_phone, contact_email, subtotal_amount, discount_amount, fee_amount, tax_amount,
            total_amount, currency, created_at, confirmed_at, completed_at, cancelled_at, cancellation_reason,
            listing:listings!inner(id, title, type, booking_mode, cancellation_policy, duration_minutes, city,
              media:listing_media(url, sort_order)),
            guest:profiles!bookings_consumer_id_fkey(id, display_name, avatar_url, home_city),
            location:business_locations(address_line1, area, city),
            staff:staff_members(id, display_name),
            items:booking_items(id, name, quantity, unit_amount, total_amount),
            events:booking_events(id, from_status, to_status, note, created_at, actor_id),
            payments(id, amount, status, method, method_summary, provider, created_at, refunds!payment_id(id, amount, status, created_at))`,
          )
          .eq('id', bookingId)
          .order('created_at', { referencedTable: 'events' })
          .single(),
      );
      const conversation = await unwrap(
        db.from('conversations').select('id').eq('booking_id', bookingId).eq('type', 'business').limit(1).maybeSingle(),
      );
      return { ...booking, conversationId: conversation?.id ?? null };
    },

    /** Pending -> confirmed. */
    acceptReservation: (bookingId: string) =>
      unwrap(db.rpc('update_booking_status', { p_booking_id: bookingId, p_status: 'confirmed' })),
    /** Pending -> declined (cancelled by the business) with a reason for the guest. */
    declineReservation: (bookingId: string, reason: string) =>
      unwrap(db.rpc('update_booking_status', { p_booking_id: bookingId, p_status: 'cancelled_by_business', p_reason: reason })),
    /** Confirmed -> cancelled by the business. */
    cancelReservation: (bookingId: string, reason: string) =>
      unwrap(db.rpc('update_booking_status', { p_booking_id: bookingId, p_status: 'cancelled_by_business', p_reason: reason })),
    /** Confirmed (started) -> completed or no-show. */
    completeReservation: (bookingId: string, outcome: 'completed' | 'no_show' = 'completed') =>
      unwrap(db.rpc('update_booking_status', { p_booking_id: bookingId, p_status: outcome })),

    /** "Message guest": the reservation's chat (created if needed). */
    startGuestConversation: (bookingId: string) => unwrap(db.rpc('start_guest_conversation', { p_booking_id: bookingId })),

    /** Inbox list (Figma 127:507) with unread counts for the signed-in team member. */
    inbox: (
      businessId: string,
      { search, unreadOnly, since, limit }: { search?: string; unreadOnly?: boolean; since?: string; limit?: number } = {},
    ) =>
      unwrap(
        db.rpc('business_inbox', {
          p_business_id: businessId,
          p_search: search || undefined,
          p_unread_only: unreadOnly ?? false,
          p_since: since,
          p_limit: limit ?? 50,
        }),
      ),

    /** Team members keep their own read state: join, then mark read up to now. */
    markConversationRead: async (conversationId: string) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('conversation_participants')
          .upsert(
            { conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString() },
            { onConflict: 'conversation_id,user_id' },
          ),
      );
    },

    /** My Listings / Drafts / Archive, optionally one category group ("All" = none). */
    listListings: async (businessId: string, status: ListingTab, { groupSlug }: { groupSlug?: string } = {}) => {
      const rows = await unwrap(
        db
          .from('listings')
          .select(PORTAL_LISTING_SELECT)
          .eq('business_id', businessId)
          .eq('status', status)
          .order(status === 'draft' ? 'updated_at' : 'published_at', { ascending: false, nullsFirst: false })
          .order('sort_order', { referencedTable: 'listing_media' }),
      );
      // A self-referencing embed is typed as an array; PostgREST returns one object.
      const normalised = rows.map((l) => {
        const parent = l.category?.parent as unknown;
        const p = (Array.isArray(parent) ? parent[0] : parent) as { id: string; slug: string; name: string } | null | undefined;
        return { ...l, category: l.category ? { ...l.category, parent: p ?? null } : null };
      });
      return groupSlug
        ? normalised.filter((l) => l.category?.slug === groupSlug || l.category?.parent?.slug === groupSlug)
        : normalised;
    },

    listingCounts: async (businessId: string) => {
      const rows = await unwrap(db.from('listings').select('status').eq('business_id', businessId));
      return {
        published: rows.filter((r) => r.status === 'published').length,
        draft: rows.filter((r) => r.status === 'draft').length,
        archived: rows.filter((r) => r.status === 'archived').length,
      };
    },

    /** Reviews page: every review of the business (or one listing), newest first, with the guest. */
    listReviews: (businessId: string, { listingId, limit = 100 }: { listingId?: string; limit?: number } = {}) => {
      let q = db
        .from('reviews')
        .select(
          `id, rating, body, photos, status, business_reply, replied_at, created_at,
          author:profiles!reviews_author_id_fkey(id, display_name, avatar_url),
          listing:listings(id, title)`,
        )
        .eq('business_id', businessId)
        .eq('status', 'published');
      if (listingId) q = q.eq('listing_id', listingId);
      return unwrap(q.order('created_at', { ascending: false }).limit(limit));
    },

    /** 5..1 star counts, average and total for the summary card. */
    reviewSummary: async (businessId: string, { listingId }: { listingId?: string } = {}) => {
      let q = db.from('reviews').select('rating').eq('business_id', businessId).eq('status', 'published');
      if (listingId) q = q.eq('listing_id', listingId);
      const rows = await unwrap(q);
      const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: rows.filter((r) => r.rating === stars).length }));
      const total = rows.length;
      const average = total ? rows.reduce((sum, r) => sum + r.rating, 0) / total : 0;
      return { average, total, distribution };
    },

    replyToReview: (reviewId: string, reply: string) =>
      unwrap(db.rpc('reply_to_review', { p_review_id: reviewId, p_reply: reply })),

    /** Insights page data. Revenue and wallet are null unless you're the owner. */
    insights: async (businessId: string, period: InsightsPeriod = 'weekly') =>
      (await unwrap(db.rpc('business_insights', { p_business_id: businessId, p_period: period }))) as unknown as BusinessInsights,

    /** What "Complete your profile" checks. */
    profileGaps: async (businessId: string) => {
      const b = await unwrap(
        db.from('businesses').select('logo_url, description, phone, email').eq('id', businessId).single(),
      );
      const photos = await unwrap(
        db.from('business_photos').select('id', { count: 'exact', head: false }).eq('business_id', businessId).limit(1),
      );
      const gaps: string[] = [];
      if (!b.logo_url) gaps.push('logo');
      if (!b.description) gaps.push('description');
      if (!b.phone && !b.email) gaps.push('contact');
      if (!photos.length) gaps.push('photos');
      return gaps;
    },
  };
}

export type PortalReservationRow = Awaited<ReturnType<ReturnType<typeof createPortalApi>['listReservations']>>[number];
export type PortalReservation = Awaited<ReturnType<ReturnType<typeof createPortalApi>['getReservation']>>;
export type PortalListing = Awaited<ReturnType<ReturnType<typeof createPortalApi>['listListings']>>[number];
export type PortalInboxRow = Awaited<ReturnType<ReturnType<typeof createPortalApi>['inbox']>>[number];
export type PortalReview = Awaited<ReturnType<ReturnType<typeof createPortalApi>['listReviews']>>[number];

/** Lowest sort_order photo of a listing (embedded media come back unordered). */
export function coverOf(media: { url: string; sort_order: number }[] | null | undefined): string | null {
  if (!media?.length) return null;
  return [...media].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
}
