import type { Enums } from '../types';
import type { SearchFilters } from '../validation/discovery';
import { ApiError, fromPostgrestError, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

// Discovery: Home (Popular Activities, Top Hosts, Services near you), Search,
// Business details, Experience details and host profiles. Anonymous users can
// call all of these; RLS only returns published listings and active businesses.

/** Fields a listing card needs (Home rails, search results, bucket list). */
export const LISTING_CARD_SELECT = `
  id, slug, title, summary, type, booking_mode, city, category_id, price_amount, price_unit, currency,
  duration_minutes, rating_avg, rating_count, booking_count, instant_book,
  business:businesses!inner(id, slug, name, logo_url, kind),
  media:listing_media(url, alt, sort_order),
  staff:listing_staff(staff:staff_members(id, display_name, title, avatar_url, is_host))
` as const;

export const HOST_CARD_SELECT = `
  id, display_name, title, avatar_url, bio, languages, rating_avg, rating_count,
  business:businesses!inner(id, slug, name, kind),
  listings:listing_staff(listing:listings(id, city, booking_count, category_id))
` as const;

export interface PageOptions {
  limit?: number;
  offset?: number;
}

const range = ({ limit = 20, offset = 0 }: PageOptions) => [offset, offset + limit - 1] as const;

export function createCatalogApi(db: MomentSupabaseClient) {
  const listingsByIds = async (ids: string[]) => {
    if (ids.length === 0) return [];
    const rows = await unwrap(
      db
        .from('listings')
        .select(LISTING_CARD_SELECT)
        .eq('status', 'published')
        .in('id', ids)
        .order('sort_order', { referencedTable: 'listing_media' }),
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  };

  return {
    /**
     * Counts a view of an experience (`listingId`) or a business page
     * (`businessId`) for the business's Insights. The server ignores repeats
     * from the same person within 30 minutes and the business's own team.
     * Guests pass a random per-install `sessionKey`. Never throws.
     */
    recordView: async (target: { listingId?: string; businessId?: string; sessionKey?: string; source?: 'app' | 'web' }) => {
      const { data } = await db.rpc('record_listing_view', {
        p_listing_id: target.listingId,
        p_business_id: target.businessId,
        p_session_key: target.sessionKey,
        p_source: target.source ?? 'app',
      });
      return data === true;
    },

    /**
     * Listing categories (chips, filters). The business sign-up groups
     * (`is_group`, see `business.listSignUpCategories`) are left out.
     */
    listCategories: (kind?: Enums<'category_kind'>) => {
      let q = db
        .from('categories')
        .select('id, parent_id, kind, slug, name, icon, sort_order')
        .eq('is_active', true)
        .eq('is_group', false);
      if (kind) q = q.eq('kind', kind);
      return unwrap(q.order('sort_order'));
    },

    /** Home > Popular Activities. */
    popularActivities: ({ city, ...page }: { city?: string } & PageOptions = {}) => {
      let q = db.from('listings').select(LISTING_CARD_SELECT).eq('status', 'published').eq('type', 'experience');
      if (city) q = q.eq('city', city);
      return unwrap(q.order('popularity_score', { ascending: false }).order('sort_order', { referencedTable: 'listing_media' }).range(...range(page)));
    },

    /** Home > Top Hosts. */
    topHosts: (page: PageOptions = {}) =>
      unwrap(
        db
          .from('staff_members')
          .select(HOST_CARD_SELECT)
          .eq('is_host', true)
          .eq('is_active', true)
          .order('rating_avg', { ascending: false })
          .order('rating_count', { ascending: false })
          .range(...range(page)),
      ),

    /**
     * Home > "Services near you" (and its See all): active service businesses
     * (spas, salons, barbers). With `near` they come nearest first with
     * `distance_km`; without it, the `city` (all cities when omitted) by
     * rating. The quiz badge's tags break ties. `from_price` is the cheapest
     * published service.
     */
    servicesNearYou: ({ near, city, limit = 20 }: { near?: { lat: number; lng: number } | null; city?: string; limit?: number } = {}) =>
      unwrap(
        db.rpc('services_near_you', {
          p_lat: near?.lat,
          p_lng: near?.lng,
          p_city: near ? undefined : city,
          p_limit: limit,
        }),
      ),

    /**
     * Explore map, experiences mode: published experiences inside the visible
     * area with Search filters, as listing cards plus pin coordinates and the
     * distance from `user` (when known). Best first.
     */
    exploreListings: async (args: {
      box: { minLat: number; minLng: number; maxLat: number; maxLng: number };
      categoryIds?: string[];
      query?: string;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      user?: { lat: number; lng: number } | null;
      limit?: number;
    }) => {
      const pins = await unwrap(
        db.rpc('explore_listings', {
          p_min_lat: args.box.minLat,
          p_min_lng: args.box.minLng,
          p_max_lat: args.box.maxLat,
          p_max_lng: args.box.maxLng,
          p_category_ids: args.categoryIds?.length ? args.categoryIds : undefined,
          p_query: args.query || undefined,
          p_min_price: args.minPrice,
          p_max_price: args.maxPrice,
          p_min_rating: args.minRating,
          p_user_lat: args.user?.lat,
          p_user_lng: args.user?.lng,
          p_limit: args.limit ?? 100,
        }),
      );
      const cards = await listingsByIds(pins.map((p) => p.listing_id));
      const byId = new Map(pins.map((p) => [p.listing_id, p]));
      return cards.flatMap((card) => {
        const pin = byId.get(card.id);
        return pin ? [{ ...card, lat: pin.lat, lng: pin.lng, distance_km: pin.distance_km === null ? null : Number(pin.distance_km) }] : [];
      });
    },

    /** Explore map, businesses mode: service businesses inside the visible area (Services near you fields + coordinates). */
    exploreBusinesses: (args: {
      box: { minLat: number; minLng: number; maxLat: number; maxLng: number };
      categorySlugs?: string[];
      query?: string;
      minRating?: number;
      user?: { lat: number; lng: number } | null;
      limit?: number;
    }) =>
      unwrap(
        db.rpc('explore_businesses', {
          p_min_lat: args.box.minLat,
          p_min_lng: args.box.minLng,
          p_max_lat: args.box.maxLat,
          p_max_lng: args.box.maxLng,
          p_category_slugs: args.categorySlugs?.length ? args.categorySlugs : undefined,
          p_query: args.query || undefined,
          p_min_rating: args.minRating,
          p_user_lat: args.user?.lat,
          p_user_lng: args.user?.lng,
          p_limit: args.limit ?? 100,
        }),
      ),

    /** Cards for these listings, in the given order (Recently viewed). Unknown or hidden ids are skipped. */
    listingsByIds: (ids: string[]) => listingsByIds(ids),

    /**
     * Home > "Local fun" / "Must-trys": listings the Moment team tagged
     * (`local-fun`, `must-try`), in the city when given, best first.
     */
    curated: async ({ tag, city, limit = 10 }: { tag: 'local-fun' | 'must-try'; city?: string; limit?: number }) => {
      const tagged = await unwrap(
        db.from('listing_tags').select('listing_id, tag:tags!inner(slug)').eq('tag.slug', tag),
      );
      if (tagged.length === 0) return [];
      let q = db
        .from('listings')
        .select(LISTING_CARD_SELECT)
        .eq('status', 'published')
        .in('id', tagged.map((t) => t.listing_id));
      if (city) q = q.eq('city', city);
      return unwrap(
        q.order('popularity_score', { ascending: false }).order('sort_order', { referencedTable: 'listing_media' }).limit(limit),
      );
    },

    /** "12 km away" on cards: km from a point to each listing, keyed by listing id. */
    listingDistances: async ({ lat, lng }: { lat: number; lng: number }, listingIds: string[]) => {
      if (listingIds.length === 0) return new Map<string, number>();
      const rows = await unwrap(db.rpc('listing_distances', { p_lat: lat, p_lng: lng, p_listing_ids: listingIds }));
      return new Map(rows.map((r) => [r.listing_id, Number(r.distance_km)]));
    },

    /**
     * Search results. `near`, `maxDistanceKm`, `date` and `sort: 'distance'` need
     * the geo/availability search RPC planned with the Explore map, so they throw
     * `unsupported` for now instead of being silently ignored.
     */
    searchListings: async (filters: SearchFilters) => {
      if (filters.near || filters.maxDistanceKm !== undefined || filters.date || filters.sort === 'distance') {
        throw new ApiError('unsupported', 'Searching by distance or date is not available yet');
      }
      let q = db.from('listings').select(LISTING_CARD_SELECT, { count: 'exact' }).eq('status', 'published');
      if (filters.hostId) {
        const links = await unwrap(db.from('listing_staff').select('listing_id').eq('staff_id', filters.hostId));
        q = q.in('id', links.map((l) => l.listing_id));
      }
      if (filters.hostedOnly) {
        const hosted = await unwrap(
          db.from('listing_staff').select('listing_id, staff:staff_members!inner(is_host)').eq('staff.is_host', true),
        );
        q = q.in('id', [...new Set(hosted.map((l) => l.listing_id))]);
      }
      if (filters.query) {
        // Prefix match on every word, so "kay" finds "kayaking" while typing.
        const words = filters.query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
        if (words.length) q = q.textSearch('search_vector', words.map((w) => `${w}:*`).join(' & '), { config: 'simple' });
      }
      if (filters.type) q = q.eq('type', filters.type);
      if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
      if (filters.categoryIds?.length) q = q.in('category_id', filters.categoryIds);
      if (filters.city) q = q.eq('city', filters.city);
      if (filters.area) {
        const locations = await unwrap(db.from('business_locations').select('id').eq('area', filters.area));
        q = q.in('location_id', locations.map((l) => l.id));
      }
      if (filters.language) q = q.contains('languages', [filters.language]);
      if (filters.priceMin !== undefined) q = q.gte('price_amount', filters.priceMin);
      if (filters.priceMax !== undefined) q = q.lte('price_amount', filters.priceMax);
      if (filters.minRating !== undefined) q = q.gte('rating_avg', filters.minRating);

      switch (filters.sort) {
        case 'rating':
          q = q.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false });
          break;
        case 'price_low':
          q = q.order('price_amount', { ascending: true });
          break;
        case 'price_high':
          q = q.order('price_amount', { ascending: false });
          break;
        case 'popular':
          q = q.order('booking_count', { ascending: false });
          break;
        default:
          q = q.order('popularity_score', { ascending: false });
      }

      const { data, error, count, status } = await q.range(filters.offset, filters.offset + filters.limit - 1);
      if (error) throw fromPostgrestError(error, status);
      return { items: data ?? [], total: count ?? 0 };
    },

    /** Experience details / service details, by id or slug. */
    getListing: (idOrSlug: string) => {
      const column = isUuid(idOrSlug) ? 'id' : 'slug';
      return unwrapRequired(
        db
          .from('listings')
          .select(
            `*,
            business:businesses!inner(id, slug, name, logo_url, cover_url, kind, rating_avg, rating_count, phone, timezone, is_verified),
            location:business_locations(id, name, address_line1, address_line2, area, city, province),
            category:categories(id, slug, name, kind),
            media:listing_media(id, url, alt, sort_order),
            options:listing_options(id, name, description, price_amount, duration_minutes, max_quantity, sort_order, is_active),
            staff:listing_staff(staff:staff_members(id, display_name, title, avatar_url, bio, is_host, rating_avg, rating_count, languages, created_at)),
            itinerary:listing_itinerary_steps(position, title, description, duration_minutes),
            tags:listing_tags(tag:tags(id, slug, name))`,
          )
          .eq(column, idOrSlug)
          .order('sort_order', { referencedTable: 'listing_media' })
          .order('sort_order', { referencedTable: 'listing_options' })
          .order('position', { referencedTable: 'listing_itinerary_steps' })
          .maybeSingle(),
        'Listing',
      );
    },

    /** Business details (Popular, Services, Reviews, About, Membership tabs). */
    getBusiness: (idOrSlug: string) => {
      const column = isUuid(idOrSlug) ? 'id' : 'slug';
      return unwrapRequired(
        db
          .from('businesses')
          .select(
            `id, slug, name, kind, tagline, description, logo_url, cover_url, phone, email, website,
            rating_avg, rating_count, currency, timezone, is_verified,
            locations:business_locations(id, name, address_line1, address_line2, area, city, province, is_primary),
            staff:staff_members(id, display_name, title, avatar_url, is_host, is_bookable, rating_avg, rating_count),
            plans:membership_plans(id, name, description, price_amount, currency, interval, benefits, discount_percent, included_sessions, sort_order),
            hours:business_hours(weekday, opens_at, closes_at),
            photos:business_photos(url, alt, sort_order)`,
          )
          .eq(column, idOrSlug)
          .eq('staff_members.is_active', true)
          .eq('membership_plans.is_active', true)
          .order('sort_order', { referencedTable: 'business_photos' })
          .order('sort_order', { referencedTable: 'membership_plans' })
          .maybeSingle(),
        'Business',
      );
    },

    /** Listings of one business, most booked first ("Popular" / "All Services"). */
    listBusinessListings: (businessId: string, { type, ...page }: { type?: Enums<'listing_type'> } & PageOptions = {}) => {
      let q = db.from('listings').select(LISTING_CARD_SELECT).eq('business_id', businessId).eq('status', 'published');
      if (type) q = q.eq('type', type);
      return unwrap(q.order('booking_count', { ascending: false }).range(...range(page)));
    },

    /** Map pin and distance: the business's locations as lat/lng, primary first. */
    businessLocationPoints: (businessId: string) => unwrap(db.rpc('business_location_points', { p_business_id: businessId })),

    /**
     * Business page "Services" tab: bookable services with their options and
     * category (for the sub-filter chips), most booked first.
     */
    listBusinessServices: (businessId: string) =>
      unwrap(
        db
          .from('listings')
          .select(
            `${LISTING_CARD_SELECT}, category:categories(id, slug, name),
            options:listing_options(id, name, description, price_amount, duration_minutes, sort_order, is_active)`,
          )
          .eq('business_id', businessId)
          .eq('status', 'published')
          .eq('type', 'service')
          .eq('listing_options.is_active', true)
          .order('booking_count', { ascending: false })
          .order('sort_order', { referencedTable: 'listing_options' })
          .order('sort_order', { referencedTable: 'listing_media' }),
      ),

    /** One membership plan (Membership Details). */
    getMembershipPlan: (planId: string) =>
      unwrapRequired(
        db
          .from('membership_plans')
          .select('id, business_id, name, description, price_amount, currency, interval, benefits, discount_percent, included_sessions, business:businesses(id, slug, name)')
          .eq('id', planId)
          .eq('is_active', true)
          .maybeSingle(),
        'Membership plan',
      ),

    /** Star filter chips on Reviews: how many published reviews have each rating. */
    reviewStats: async (businessId: string) => {
      const rows = await unwrap(db.from('reviews').select('rating').eq('business_id', businessId).eq('status', 'published'));
      const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of rows) counts[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
      return { total: rows.length, counts };
    },

    /** Host Profile (About and Listings tabs). Listings are published experiences only (RLS). */
    getHost: (staffId: string) =>
      unwrapRequired(
        db
          .from('staff_members')
          .select(
            `id, display_name, title, avatar_url, cover_url, bio, languages, rating_avg, rating_count, created_at,
            business:businesses!inner(id, slug, name, kind, is_verified, logo_url, cover_url),
            listings:listing_staff(listing:listings(${LISTING_CARD_SELECT}))`,
          )
          .eq('id', staffId)
          .eq('is_host', true)
          .maybeSingle(),
        'Host',
      ),

    /** Published reviews with author name and avatar, newest first. */
    listReviews: (
      target: { listingId: string } | { businessId: string } | { staffId: string },
      page: PageOptions & { rating?: number } = {},
    ) => {
      let q = db
        .from('reviews')
        .select('id, rating, body, photos, business_reply, replied_at, created_at, author:profiles!reviews_author_id_fkey(id, display_name, avatar_url)', {
          count: 'exact',
        })
        .eq('status', 'published');
      if ('listingId' in target) q = q.eq('listing_id', target.listingId);
      else if ('businessId' in target) q = q.eq('business_id', target.businessId);
      else q = q.eq('staff_id', target.staffId);
      if (page.rating) q = q.eq('rating', page.rating);
      return unwrap(q.order('created_at', { ascending: false }).range(...range(page)));
    },

    /** Offers screen and "Available Coupons" on checkout: public, active coupons. Signed-in users only (RLS). */
    listPublicCoupons: ({ businessId }: { businessId?: string } = {}) => {
      const now = new Date().toISOString();
      let q = db
        .from('coupons')
        .select('id, business_id, code, title, description, discount_type, discount_value, currency, max_discount_amount, min_subtotal_amount, ends_at, listing_ids')
        .eq('is_active', true)
        .eq('is_public', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gt.${now}`);
      q = businessId ? q.or(`business_id.is.null,business_id.eq.${businessId}`) : q;
      return unwrap(q.order('ends_at', { ascending: true, nullsFirst: false }));
    },

    /** Public platform settings (feature flags, fees shown to users). */
    getPublicSettings: async () => {
      const rows = await unwrap(db.from('platform_settings').select('key, value').eq('is_public', true));
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },

    /** Latest published version of a legal document (Terms, Privacy, Cancellation). */
    getLegalDocument: (type: Enums<'legal_document_type'>) =>
      unwrapRequired(
        db
          .from('legal_documents')
          .select('id, type, version, title, body, published_at')
          .eq('type', type)
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        'Document',
      ),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID_RE.test(value);
