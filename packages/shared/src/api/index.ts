import { createAccountApi } from './account';
import { createAuthApi } from './auth';
import { createBookingsApi } from './bookings';
import { createBusinessApi } from './business';
import { createCatalogApi } from './catalog';
import { createEngagementApi } from './engagement';
import type { MomentSupabaseClient } from './errors';
import { createBusinessProfileApi } from './business-profile';
import { createListingEditorApi } from './listing-editor';
import { createPortalApi } from './portal';
import { createProfileApi } from './profile';
import { createChatApi, createGroupsApi, createSupportApi } from './social';

/**
 * Typed API for every Moment client (mobile, web, portal, admin, later POS).
 * Pass the platform's own Supabase client, which owns session storage:
 *
 *   // apps/mobile
 *   export const api = createMomentApi(supabase);
 *   // apps/web (per request on the server)
 *   const api = createMomentApi(await createClient());
 *
 * Every method throws `ApiError` on failure and returns typed rows on success.
 */
export function createMomentApi(db: MomentSupabaseClient) {
  const engagement = createEngagementApi(db);
  return {
    db,
    auth: createAuthApi(db),
    profile: createProfileApi(db),
    catalog: createCatalogApi(db),
    bookings: createBookingsApi(db),
    bucketList: engagement.bucketList,
    reviews: engagement.reviews,
    quiz: engagement.quiz,
    recommendPlace: engagement.recommendPlace,
    groups: createGroupsApi(db),
    chat: createChatApi(db),
    support: createSupportApi(db),
    account: createAccountApi(db),
    business: createBusinessApi(db),
    portal: createPortalApi(db),
    listingEditor: createListingEditorApi(db),
    businessProfile: createBusinessProfileApi(db),
    media: {
      /**
       * Public URL for a media column. http(s) URLs pass through; storage refs
       * (`storage://<bucket>/<path>`, used by seed data) resolve against this
       * client's Supabase URL, so they work from a simulator and a phone alike.
       */
      url: (ref: string | null | undefined): string | null => {
        if (!ref) return null;
        const m = /^storage:\/\/([^/]+)\/(.+)$/.exec(ref);
        return m ? db.storage.from(m[1] as string).getPublicUrl(m[2] as string).data.publicUrl : ref;
      },
    },
  };
}

export type MomentApi = ReturnType<typeof createMomentApi>;

export { LISTING_CARD_SELECT, HOST_CARD_SELECT, isUuid, type PageOptions } from './catalog';
export { BOOKING_LIST_SELECT, PAST_STATUSES, UPCOMING_STATUSES } from './bookings';
export type { ChatMessageEvent } from './social';
export type { EmailSignInMethod, OAuthProvider } from './auth';
export * from './errors';
export * from './portal';
export * from './listing-editor';
export * from './business-profile';
