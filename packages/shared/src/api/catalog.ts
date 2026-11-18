import type { Enums } from '../types';
import type { SearchFilters } from '../validation/discovery';
import { ApiError, fromPostgrestError, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

// Discovery: Home (Popular Activities, Top Hosts, Just For You), Search,
// Business details, Experience details and host profiles. Anonymous users can
// call all of these; RLS only returns published listings and active businesses.

/** Fields a listing card needs (Home rails, search results, bucket list). */
export const LISTING_CARD_SELECT = `
  id, slug, title, summary, type, booking_mode, city, price_amount, price_unit, currency,
  duration_minutes, rating_avg, rating_count, booking_count, instant_book,
  business:businesses!inner(id, slug, name, logo_url, kind),
  media:listing_media(url, alt, sort_order)
` as const;

export const HOST_CARD_SELECT = `
  id, display_name, title, avatar_url, bio, languages, rating_avg, rating_count,
  business:businesses!inner(id, slug, name, kind)
` as const;

export interface PageOptions {
  limit?: number;
  offset?: number;
}

const range = ({ limit = 20, offset = 0 }: PageOptions) => [offset, offset + limit - 1] as const;

export function createCatalogApi(db: MomentSupabaseClient) {
  return {
    listCategories: (kind?: Enums<'category_kind'>) => {
      let q = db.from('categories').select('id, parent_id, kind, slug, name, icon, sort_order').eq('is_active', true);
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

    /** Home > Just For You: personalised by the quiz badge (falls back to popular when signed out). */
    justForYou: ({ city, limit = 20 }: { city?: string; limit?: number } = {}) =>
      unwrap(db.rpc('recommended_listings', { p_city: city, p_limit: limit })),

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
      if (filters.query) q = q.textSearch('search_vector', filters.query, { type: 'websearch', config: 'simple' });
      if (filters.type) q = q.eq('type', filters.type);
      if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
      if (filters.city) q = q.eq('city', filters.city);
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
            business:businesses!inner(id, slug, name, logo_url, cover_url, kind, rating_avg, rating_count, phone, timezone),
            location:business_locations(id, name, address_line1, address_line2, area, city, province),
            category:categories(id, slug, name, kind),
            media:listing_media(id, url, alt, sort_order),
            options:listing_options(id, name, description, price_amount, duration_minutes, max_quantity, sort_order, is_active),
            staff:listing_staff(staff:staff_members(id, display_name, title, avatar_url, is_host, rating_avg, rating_count, languages)),
            tags:listing_tags(tag:tags(id, slug, name))`,
          )
          .eq(column, idOrSlug)
          .order('sort_order', { referencedTable: 'listing_media' })
          .order('sort_order', { referencedTable: 'listing_options' })
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
            rating_avg, rating_count, currency, timezone,
            locations:business_locations(id, name, address_line1, address_line2, area, city, province, is_primary),
            staff:staff_members(id, display_name, title, avatar_url, is_host, is_bookable, rating_avg, rating_count),
            plans:membership_plans(id, name, description, price_amount, currency, interval, benefits, discount_percent, included_sessions, sort_order)`,
          )
          .eq(column, idOrSlug)
          .eq('staff_members.is_active', true)
          .eq('membership_plans.is_active', true)
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

    /** "About the host" (About and Listings tabs). */
    getHost: (staffId: string) =>
      unwrapRequired(
        db
          .from('staff_members')
          .select(`${HOST_CARD_SELECT}, listings:listing_staff(listing:listings(${LISTING_CARD_SELECT}))`)
          .eq('id', staffId)
          .eq('is_host', true)
          .maybeSingle(),
        'Host',
      ),

    /** Published reviews with author name and avatar, newest first. */
    listReviews: (
      target: { listingId: string } | { businessId: string } | { staffId: string },
      page: PageOptions = {},
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
