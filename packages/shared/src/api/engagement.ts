import { toGeoPoint } from '../types';
import type { BucketListItemForm, RecommendPlace } from '../validation/discovery';
import type { ReviewForm } from '../validation/social';
import { LISTING_CARD_SELECT, type PageOptions } from './catalog';
import { requireUserId, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

// Bucket List, Recommend a place, reviews and the Adventure Quiz.

export function createEngagementApi(db: MomentSupabaseClient) {
  return {
    bucketList: {
      list: async ({ limit = 50, offset = 0 }: PageOptions = {}) => {
        const userId = await requireUserId(db);
        return unwrap(
          db
            .from('bucket_list_items')
            .select(`id, note, created_at, listing:listings(${LISTING_CARD_SELECT}), business:businesses(id, slug, name, logo_url, cover_url, rating_avg, rating_count)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
        );
      },

      add: async (form: BucketListItemForm) => {
        const userId = await requireUserId(db);
        return unwrap(
          db
            .from('bucket_list_items')
            .insert({ user_id: userId, listing_id: form.listingId ?? null, business_id: form.businessId ?? null, note: form.note ?? null })
            .select()
            .single(),
        );
      },

      updateNote: (itemId: string, note: string | null) =>
        unwrap(db.from('bucket_list_items').update({ note }).eq('id', itemId)),

      remove: (itemId: string) => unwrap(db.from('bucket_list_items').delete().eq('id', itemId)),

      /** Ids already saved, to fill the heart icons on cards. */
      savedIds: async () => {
        const userId = await requireUserId(db);
        const rows = await unwrap(db.from('bucket_list_items').select('id, listing_id, business_id').eq('user_id', userId));
        return {
          listings: new Map(rows.filter((r) => r.listing_id).map((r) => [r.listing_id as string, r.id])),
          businesses: new Map(rows.filter((r) => r.business_id).map((r) => [r.business_id as string, r.id])),
        };
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
