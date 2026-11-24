import { toGeoPoint } from '../types';
import type { BucketListItemForm, BucketListNameForm, RecommendPlace } from '../validation/discovery';
import type { ReviewForm } from '../validation/social';
import { LISTING_CARD_SELECT } from './catalog';
import { ApiError, requireUserId, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

// Bucket List, Recommend a place, reviews and the Adventure Quiz.

export function createEngagementApi(db: MomentSupabaseClient) {
  return {
    /**
     * Bucket lists (Figma "Bucket List"): named lists of saved experiences and
     * businesses. A listing can be in several lists; a heart is filled while it
     * is in any of them.
     */
    bucketList: {
      /** All my lists, newest first, with item count and the first item's photo for the thumbnail. */
      lists: async () => {
        const userId = await requireUserId(db);
        const rows = await unwrap(
          db
            .from('bucket_lists')
            .select(
              `id, name, share_token, created_at, updated_at,
              count:bucket_list_items(count),
              first:bucket_list_items(created_at, listing:listings(media:listing_media(url, sort_order)), business:businesses(cover_url, logo_url))`,
            )
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .order('created_at', { referencedTable: 'first', ascending: true })
            .limit(1, { referencedTable: 'first' }),
        );
        return rows.map(({ count, first, ...list }) => {
          const item = first[0];
          const media = [...(item?.listing?.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
          return {
            ...list,
            itemCount: count[0]?.count ?? 0,
            thumbnailUrl: media[0]?.url ?? item?.business?.cover_url ?? item?.business?.logo_url ?? null,
          };
        });
      },

      /** One list with its items (listing cards), oldest first. */
      getList: (listId: string) =>
        unwrapRequired(
          db
            .from('bucket_lists')
            .select(
              `id, name, share_token, created_at, updated_at,
              items:bucket_list_items(id, note, created_at, listing:listings(${LISTING_CARD_SELECT}), business:businesses(id, slug, name, logo_url, cover_url, rating_avg, rating_count))`,
            )
            .eq('id', listId)
            .order('created_at', { referencedTable: 'bucket_list_items', ascending: true })
            .maybeSingle(),
          'Bucket list',
        ),

      createList: async (form: BucketListNameForm) => {
        const userId = await requireUserId(db);
        return unwrap(db.from('bucket_lists').insert({ user_id: userId, name: form.name }).select('id, name, share_token, created_at, updated_at').single());
      },

      renameList: (listId: string, form: BucketListNameForm) =>
        unwrap(db.from('bucket_lists').update({ name: form.name }).eq('id', listId).select('id, name').single()),

      /** Deletes the list and everything saved in it. */
      deleteList: (listId: string) => unwrap(db.from('bucket_lists').delete().eq('id', listId)),

      addItem: async (form: BucketListItemForm) => {
        const userId = await requireUserId(db);
        return unwrap(
          db
            .from('bucket_list_items')
            .insert({
              bucket_list_id: form.bucketListId,
              user_id: userId,
              listing_id: form.listingId ?? null,
              business_id: form.businessId ?? null,
              note: form.note ?? null,
            })
            .select()
            .single(),
        );
      },

      /** Takes a listing out of one list (other lists keep it). */
      removeListing: (listId: string, listingId: string) =>
        unwrap(db.from('bucket_list_items').delete().eq('bucket_list_id', listId).eq('listing_id', listingId)),

      /** Takes a business out of one list. */
      removeBusiness: (listId: string, businessId: string) =>
        unwrap(db.from('bucket_list_items').delete().eq('bucket_list_id', listId).eq('business_id', businessId)),

      removeItem: (itemId: string) => unwrap(db.from('bucket_list_items').delete().eq('id', itemId)),

      moveItem: (itemId: string, toListId: string) =>
        unwrap(db.from('bucket_list_items').update({ bucket_list_id: toListId }).eq('id', itemId).select().single()),

      updateNote: (itemId: string, note: string | null) =>
        unwrap(db.from('bucket_list_items').update({ note }).eq('id', itemId)),

      /** What is saved where, to fill hearts and tick lists: id -> list ids holding it. */
      savedIds: async () => {
        const userId = await requireUserId(db);
        const rows = await unwrap(
          db.from('bucket_list_items').select('bucket_list_id, listing_id, business_id').eq('user_id', userId),
        );
        const listings = new Map<string, string[]>();
        const businesses = new Map<string, string[]>();
        for (const r of rows) {
          const [map, key] = r.listing_id ? [listings, r.listing_id] : [businesses, r.business_id as string];
          map.set(key, [...(map.get(key) ?? []), r.bucket_list_id]);
        }
        return { listings, businesses };
      },
    },

    /** "Recommend a service". */
    recommendPlace: async (form: RecommendPlace) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('place_recommendations')
          .insert({
            user_id: userId,
            name: form.name,
            city: form.city,
            category_id: form.categoryId ?? null,
            address: form.address ?? null,
            contact_phone: form.contactPhone ?? null,
            // The type picker has no column of its own; keep it with the note for the Moment team.
            note: [`Type: ${form.kind === 'experience' ? 'Things to do' : 'Business services'}`, form.note]
              .filter(Boolean)
              .join('\n'),
            geo: form.location ? toGeoPoint(form.location.lat, form.location.lng) : null,
          })
          .select('id, status, created_at')
          .single(),
      );
    },

    reviews: {
      /** "Write a review" for a completed booking. Business, listing and staff are filled from the booking. */
      create: async (form: ReviewForm) => {
        const userId = await requireUserId(db);
        const booking = await unwrapRequired(
          db.from('bookings').select('id, business_id, listing_id').eq('id', form.bookingId).maybeSingle(),
          'Booking',
        );
        return unwrap(
          db
            .from('reviews')
            .insert({
              author_id: userId,
              booking_id: booking.id,
              business_id: booking.business_id,
              listing_id: booking.listing_id,
              rating: form.rating,
              body: form.body ?? null,
              photos: form.photos,
            })
            .select()
            .single(),
        );
      },

      update: (reviewId: string, form: Pick<ReviewForm, 'rating' | 'body' | 'photos'>) =>
        unwrap(
          db.from('reviews').update({ rating: form.rating, body: form.body ?? null, photos: form.photos }).eq('id', reviewId).select().single(),
        ),

      remove: (reviewId: string) => unwrap(db.from('reviews').delete().eq('id', reviewId)),

      /**
       * My completed visits to this business that have no review yet, newest
       * first. Empty means "You can review after your visit".
       */
      reviewableBookings: (businessId: string) => unwrap(db.rpc('reviewable_bookings', { p_business_id: businessId })),

      /**
       * Uploads one review photo to `review-photos/<user_id>/...` and returns its
       * storage ref (`storage://review-photos/...`), ready for `photos` on
       * `create`; `api.media.url` turns it into a URL on any client.
       */
      uploadPhoto: async (file: { body: ArrayBuffer; contentType: string; extension: string }) => {
        const userId = await requireUserId(db);
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.extension}`;
        const { error } = await db.storage.from('review-photos').upload(path, file.body, { contentType: file.contentType });
        if (error) throw new ApiError('network', `Could not upload the photo: ${error.message}`, undefined, undefined, error);
        return `storage://review-photos/${path}`;
      },
    },

    quiz: {
      /** Adventure Quiz questions with answers, in order. */
      getQuestions: () =>
        unwrap(
          db
            .from('quiz_questions')
            .select('id, prompt, kind, config, image_url, sort_order, answers:quiz_answers(id, label, icon, image_url, sort_order)')
            .eq('is_active', true)
            .order('sort_order')
            .order('sort_order', { referencedTable: 'quiz_answers' }),
        ),

      /**
       * Scores on the server, sets the personality badge (replacing any earlier
       * quiz result) and returns the result with its badge.
       */
      submit: async (answerIds: string[]) => {
        const result = await unwrap(db.rpc('submit_quiz', { p_answer_ids: answerIds }));
        const badge = result.badge_id
          ? await unwrap(
              db.from('badges').select('id, code, name, description, icon, primary_trait').eq('id', result.badge_id).single(),
            )
          : null;
        return { ...result, badge };
      },

      latestResult: async () => {
        const userId = await requireUserId(db);
        return unwrap(
          db
            .from('quiz_results')
            .select('id, trait_scores, completed_at, badge:badges(id, code, name, description, icon, primary_trait)')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        );
      },
    },
  };
}
