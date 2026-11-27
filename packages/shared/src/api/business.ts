import type { Enums } from '../types';
import type { CreateBusiness } from '../validation/business';
import { BOOKING_LIST_SELECT } from './bookings';
import type { PageOptions } from './catalog';
import { ApiError, requireUserId, unwrap, type MomentSupabaseClient } from './errors';

// Business-side reads and actions shared by the business portal and, later,
// the POS. Every query is scoped by `business_id`; RLS rejects other businesses.
// Listing / staff / schedule management lands with the portal screens.

export function createBusinessApi(db: MomentSupabaseClient) {
  return {
    /**
     * "What does your business provide? Select one." tiles: the category groups,
     * with the kind a business (not a host) becomes when it picks one.
     */
    listSignUpCategories: () =>
      unwrap(
        db
          .from('categories')
          .select('id, slug, name, kind, description, business_kind, sort_order')
          .eq('is_active', true)
          .eq('is_group', true)
          .order('sort_order'),
      ),

    /**
     * "Agree & Continue": creates the business (creator = owner, status
     * pending_review) and its primary location in one transaction. Hosts are
     * 'host'; businesses take the kind of the category group they picked.
     * Returns the new business id.
     */
    createBusiness: async (input: CreateBusiness): Promise<string> => {
      let kind: Enums<'business_kind'> = 'host';
      if (input.type === 'business') {
        const group = await unwrap(
          db.from('categories').select('business_kind').eq('id', input.categoryId).eq('is_group', true).maybeSingle(),
        );
        if (!group?.business_kind) throw new ApiError('invalid', 'Choose what your business provides');
        kind = group.business_kind;
      }
      return unwrap(
        db.rpc('create_business', {
          p_name: input.name,
          p_kind: kind,
          p_category_id: input.categoryId,
          p_address: input.address,
          p_city: input.city,
          p_country_code: input.countryCode,
          p_email: input.email,
          p_phone: input.phone,
        }),
      );
    },

    /** Businesses the signed-in user belongs to, with their role (portal business switcher). */
    listMyBusinesses: async () => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('business_members')
          .select('role, status, business:businesses!inner(id, slug, name, logo_url, status, kind, currency, timezone)')
          .eq('user_id', userId)
          .eq('status', 'active'),
      );
    },

    listBookings: (
      businessId: string,
      {
        from,
        to,
        status,
        limit = 50,
        offset = 0,
      }: { from?: string; to?: string; status?: Enums<'booking_status'>[] } & PageOptions = {},
    ) => {
      let q = db
        .from('bookings')
        .select(`${BOOKING_LIST_SELECT}, contact_name, contact_phone, contact_email, notes, staff_id`)
        .eq('business_id', businessId);
      if (from) q = q.gte('starts_at', from);
      if (to) q = q.lt('starts_at', to);
      if (status?.length) q = q.in('status', status);
      return unwrap(q.order('starts_at').range(offset, offset + limit - 1));
    },

    /** Confirm, complete, mark no-show or cancel as the business. */
    updateBookingStatus: (bookingId: string, status: Enums<'booking_status'>, reason?: string) =>
      unwrap(db.rpc('update_booking_status', { p_booking_id: bookingId, p_status: status, p_reason: reason })),

    replyToReview: (reviewId: string, reply: string) =>
      unwrap(db.rpc('reply_to_review', { p_review_id: reviewId, p_reply: reply })),

    /** All reviews for the business, including hidden or flagged ones it can see. */
    listReviews: (businessId: string, { limit = 30, offset = 0 }: PageOptions = {}) =>
      unwrap(
        db
          .from('reviews')
          .select('*, listing:listings(id, title)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
      ),

    /** Shared business inbox. */
    inbox: (businessId: string, { limit = 30, offset = 0 }: PageOptions = {}) =>
      unwrap(
        db
          .from('conversations')
          .select('id, type, last_message_at, booking_id, created_by')
          .eq('business_id', businessId)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .range(offset, offset + limit - 1),
      ),

    /** Owners only. The plaintext key is returned once; store it on the device. */
    createApiKey: (businessId: string, name: string, scopes?: string[]) =>
      unwrap(db.rpc('create_business_api_key', { p_business_id: businessId, p_name: name, p_scopes: scopes })),
  };
}
