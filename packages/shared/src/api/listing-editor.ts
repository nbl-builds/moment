import type { TablesUpdate } from '../types';
import { listingMissing } from '../listing-wizard';
import { localDateTimeToIso } from '../format/datetime';
import { ApiError, requireUserId, unwrap, type MomentSupabaseClient } from './errors';

// Create New Listing wizard (business portal). Every step saves straight to
// the draft listing; RLS lets owners and managers write their own business's
// listings, media, options, staff links and schedules.

export const LISTING_EDITOR_SELECT = `
  id, business_id, type, booking_mode, slug, title, description, status, city, category_id,
  duration_minutes, slot_interval_minutes, buffer_minutes, min_guests, max_guests, private_max_guests,
  price_amount, price_unit, private_price_amount, currency, instant_book, cancellation_policy,
  booking_cutoff_minutes, languages, includes, what_to_bring, address_line1, province, postal_code,
  meeting_point_notes, location_id, min_age, activity_level, skill_level,
  group_discount_min_guests, group_discount_percent, early_bird_days, early_bird_percent,
  wizard_step, submitted_at, published_at, updated_at,
  category:categories(id, slug, name, parent_id),
  media:listing_media(id, url, alt, sort_order),
  options:listing_options(id, name, description, price_amount, duration_minutes, max_quantity, is_active, sort_order),
  staff:listing_staff(staff_id),
  rules:availability_rules(id, weekdays, start_time, capacity, valid_from, valid_until, is_active),
  business:businesses!inner(id, kind, status, name, slug, timezone, currency)
` as const;

export const STAFF_MEMBER_SELECT = `
  id, user_id, display_name, title, bio, avatar_url, languages, is_host, is_bookable, is_active,
  schedules:staff_schedules(id, weekday, start_time, end_time)
` as const;

/** Columns a wizard step may change. */
export type ListingPatch = Pick<
  TablesUpdate<'listings'>,
  | 'type'
  | 'booking_mode'
  | 'title'
  | 'description'
  | 'city'
  | 'category_id'
  | 'duration_minutes'
  | 'slot_interval_minutes'
  | 'buffer_minutes'
  | 'min_guests'
  | 'max_guests'
  | 'private_max_guests'
  | 'price_amount'
  | 'price_unit'
  | 'private_price_amount'
  | 'instant_book'
  | 'cancellation_policy'
  | 'booking_cutoff_minutes'
  | 'languages'
  | 'includes'
  | 'what_to_bring'
  | 'address_line1'
  | 'province'
  | 'postal_code'
  | 'meeting_point_notes'
  | 'min_age'
  | 'activity_level'
  | 'skill_level'
  | 'group_discount_min_guests'
  | 'group_discount_percent'
  | 'early_bird_days'
  | 'early_bird_percent'
  | 'wizard_step'
>;

export interface EditorOption {
  id?: string;
  name: string;
  description?: string | null;
  price_amount: number;
  duration_minutes?: number | null;
}

export interface WeeklySchedule {
  /** ISO weekdays, 1 = Monday. */
  weekdays: number[];
  /** Local start times, "HH:MM". */
  times: string[];
  validFrom: string;
  validUntil: string | null;
}

const randomName = (ext: string) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

export function createListingEditorApi(db: MomentSupabaseClient) {
  async function load(listingId: string) {
    const listing = await unwrap(
      db
        .from('listings')
        .select(LISTING_EDITOR_SELECT)
        .eq('id', listingId)
        .order('sort_order', { referencedTable: 'media' })
        .order('sort_order', { referencedTable: 'options' })
        .order('start_time', { referencedTable: 'rules' })
        .maybeSingle(),
    );
    if (!listing) return null;
    const staffIds = listing.staff.map((s) => s.staff_id);
    const [point, oneOff, schedules] = await Promise.all([
      db.rpc('listing_point', { p_listing_id: listingId }),
      db
        .from('slots')
        .select('id, starts_at, ends_at, capacity, seats_booked, status')
        .eq('listing_id', listingId)
        .is('rule_id', null)
        .neq('status', 'cancelled')
        .gt('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(50),
      staffIds.length
        ? db.from('staff_schedules').select('staff_id', { count: 'exact', head: true }).in('staff_id', staffIds)
        : Promise.resolve({ count: 0 }),
    ]);
    const p = (point.data ?? [])[0] ?? null;
    const oneOffSessions = oneOff.data ?? [];
    const hasAvailability =
      listing.booking_mode === 'appointment'
        ? (schedules.count ?? 0) > 0
        : listing.rules.some((r) => r.is_active) || oneOffSessions.length > 0;
    const pin = p?.from_meeting_point ? { lat: p.lat, lng: p.lng } : null;
    const missing = listingMissing({
      type: listing.type,
      booking_mode: listing.booking_mode,
      title: listing.title,
      description: listing.description,
      category_id: listing.category_id,
      photoCount: listing.media.length,
      price_amount: listing.price_amount,
      hasLocation: Boolean(pin) || Boolean(listing.location_id),
      hasAvailability,
      staffCount: staffIds.length,
    });
    return { ...listing, staffIds, pin, oneOffSessions, hasAvailability, missing };
  }

  return {
    /** Step 1 ("Experience Type"): creates the draft every later step saves to. */
    createDraft: (businessId: string, type: 'experience' | 'service') =>
      unwrap(db.rpc('create_listing_draft', { p_business_id: businessId, p_type: type })),

    /** The listing as the wizard edits it (null when missing or not yours). */
    get: load,

    /** Autosave for one step. */
    save: (listingId: string, patch: ListingPatch) =>
      unwrap(db.from('listings').update(patch).eq('id', listingId).select('id, updated_at').single()),

    /** Map pin for the meeting point (null clears it). */
    setPin: (listingId: string, pin: { lat: number; lng: number } | null) =>
      unwrap(
        db
          .from('listings')
          // PostgREST casts EWKT text to geography.
          .update({ meeting_point: pin ? `SRID=4326;POINT(${pin.lng} ${pin.lat})` : null } as TablesUpdate<'listings'>)
          .eq('id', listingId)
          .select('id')
          .single(),
      ),

    // -- Photos ----------------------------------------------------------------
    /** Uploads a (resized) photo to `business-media/<business>/listings/<listing>/` and adds it last. */
    uploadPhoto: async (args: { businessId: string; listingId: string; file: { body: ArrayBuffer | Blob; contentType: string; extension: string }; sortOrder: number }) => {
      const path = `${args.businessId}/listings/${args.listingId}/${randomName(args.file.extension)}`;
      const { error } = await db.storage.from('business-media').upload(path, args.file.body, { contentType: args.file.contentType });
      if (error) throw new ApiError('network', `Could not upload the photo: ${error.message}`, undefined, undefined, error);
      return unwrap(
        db
          .from('listing_media')
          .insert({ business_id: args.businessId, listing_id: args.listingId, url: `storage://business-media/${path}`, sort_order: args.sortOrder })
          .select('id, url, alt, sort_order')
          .single(),
      );
    },

    /** New order (first = cover). */
    reorderPhotos: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id, i) => db.from('listing_media').update({ sort_order: i }).eq('id', id)));
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new ApiError('network', failed.error.message, undefined, undefined, failed.error);
    },

    deletePhoto: async (media: { id: string; url: string }) => {
      await unwrap(db.from('listing_media').delete().eq('id', media.id).select('id'));
      const m = /^storage:\/\/business-media\/(.+)$/.exec(media.url);
      // The row is what matters; a leftover file is harmless.
      if (m) await db.storage.from('business-media').remove([m[1] as string]);
    },

    // -- Pricing ------------------------------------------------------------------
    /** Replaces the extra options / tiers with this list (kept in order). */
    saveOptions: async (args: { businessId: string; listingId: string; options: EditorOption[] }) => {
      const existing = await unwrap(db.from('listing_options').select('id').eq('listing_id', args.listingId));
      const keep = new Set(args.options.map((o) => o.id).filter(Boolean));
      const remove = existing.map((e) => e.id).filter((id) => !keep.has(id));
      // Options already booked can't be deleted (booking_items keep them): hide those instead.
      for (const id of remove) {
        const { error } = await db.from('listing_options').delete().eq('id', id);
        if (error) await db.from('listing_options').update({ is_active: false }).eq('id', id);
      }
      await Promise.all(
        args.options.map((o, i) => {
          const row = {
            business_id: args.businessId,
            listing_id: args.listingId,
            name: o.name,
            description: o.description ?? null,
            price_amount: o.price_amount,
            duration_minutes: o.duration_minutes ?? null,
            sort_order: i,
            is_active: true,
          };
          return unwrap(o.id ? db.from('listing_options').update(row).eq('id', o.id).select('id') : db.from('listing_options').insert(row).select('id'));
        }),
      );
    },

    /** Moment's commission in basis points (1000 = 10%). */
    commissionBps: async () => (await unwrap(db.rpc('business_commission_bps'))) ?? 1000,

    // -- Availability (experiences) ---------------------------------------------------
    /** Replaces the weekly schedule: one rule per start time; sessions are generated by the database. */
    saveWeeklySchedule: async (args: { businessId: string; listingId: string; capacity: number; schedule: WeeklySchedule | null }) => {
      await unwrap(db.from('availability_rules').delete().eq('listing_id', args.listingId).select('id'));
      const s = args.schedule;
      if (!s || s.weekdays.length === 0 || s.times.length === 0) return;
      await unwrap(
        db
          .from('availability_rules')
          .insert(
            s.times.map((t) => ({
              business_id: args.businessId,
              listing_id: args.listingId,
              weekdays: s.weekdays,
              start_time: t,
              capacity: args.capacity,
              valid_from: s.validFrom,
              valid_until: s.validUntil,
            })),
          )
          .select('id'),
      );
    },

    /** A one-off session on a date. */
    addOneOffSession: (args: { businessId: string; listingId: string; date: string; time: string; timeZone: string; durationMinutes: number; capacity: number }) => {
      const startsAt = localDateTimeToIso(args.date, args.time, args.timeZone);
      const endsAt = new Date(new Date(startsAt).getTime() + args.durationMinutes * 60000).toISOString();
      return unwrap(
        db
          .from('slots')
          .insert({ business_id: args.businessId, listing_id: args.listingId, starts_at: startsAt, ends_at: endsAt, capacity: args.capacity })
          .select('id, starts_at, ends_at, capacity, seats_booked, status')
          .single(),
      );
    },

    /** Removes a one-off session nobody booked (booked ones are cancelled from Listing Details). */
    removeOneOffSession: (slotId: string) =>
      unwrap(db.from('slots').delete().eq('id', slotId).eq('seats_booked', 0).is('rule_id', null).select('id')),

    // -- Staff (services) and hosts ---------------------------------------------------
    listStaff: (businessId: string) =>
      unwrap(
        db
          .from('staff_members')
          .select(STAFF_MEMBER_SELECT)
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('display_name')
          .order('weekday', { referencedTable: 'schedules' }),
      ),

    addStaff: (args: { businessId: string; displayName: string; title?: string | null }) =>
      unwrap(
        db
          .from('staff_members')
          .insert({ business_id: args.businessId, display_name: args.displayName, title: args.title ?? null, is_bookable: true })
          .select(STAFF_MEMBER_SELECT)
          .single(),
      ),

    /** Who performs (services) or hosts (experiences) this listing. */
    setListingStaff: async (args: { businessId: string; listingId: string; staffIds: string[] }) => {
      await unwrap(db.from('listing_staff').delete().eq('listing_id', args.listingId).select('staff_id'));
      if (args.staffIds.length === 0) return;
      await unwrap(
        db
          .from('listing_staff')
          .insert(args.staffIds.map((staffId) => ({ business_id: args.businessId, listing_id: args.listingId, staff_id: staffId })))
          .select('staff_id'),
      );
    },

    /** Replaces one person's weekly hours. */
    saveStaffHours: async (args: { businessId: string; staffId: string; hours: { weekday: number; start: string; end: string }[] }) => {
      await unwrap(db.from('staff_schedules').delete().eq('staff_id', args.staffId).select('id'));
      if (args.hours.length === 0) return;
      await unwrap(
        db
          .from('staff_schedules')
          .insert(args.hours.map((h) => ({ business_id: args.businessId, staff_id: args.staffId, weekday: h.weekday, start_time: h.start, end_time: h.end })))
          .select('id'),
      );
    },

    businessHours: (businessId: string) =>
      unwrap(db.from('business_hours').select('weekday, opens_at, closes_at').eq('business_id', businessId).order('weekday').order('opens_at')),

    /** "Your information": the signed-in person's host card for this business (null if none yet). */
    myHostCard: async (businessId: string) => {
      const userId = await requireUserId(db);
      return unwrap(db.from('staff_members').select(STAFF_MEMBER_SELECT).eq('business_id', businessId).eq('user_id', userId).maybeSingle());
    },

    /** Creates or updates the signed-in person's host card. */
    saveHostCard: async (args: { businessId: string; id?: string; displayName: string; bio: string | null; languages: string[]; avatarUrl: string | null }) => {
      const userId = await requireUserId(db);
      const row = {
        business_id: args.businessId,
        user_id: userId,
        display_name: args.displayName,
        bio: args.bio,
        languages: args.languages,
        avatar_url: args.avatarUrl,
        is_host: true,
      };
      return unwrap(
        args.id
          ? db.from('staff_members').update(row).eq('id', args.id).select(STAFF_MEMBER_SELECT).single()
          : db.from('staff_members').insert(row).select(STAFF_MEMBER_SELECT).single(),
      );
    },

    /** Uploads a host photo to `business-media/<business>/staff/` and returns its storage ref. */
    uploadHostPhoto: async (args: { businessId: string; file: { body: ArrayBuffer | Blob; contentType: string; extension: string } }) => {
      const path = `${args.businessId}/staff/${randomName(args.file.extension)}`;
      const { error } = await db.storage.from('business-media').upload(path, args.file.body, { contentType: args.file.contentType });
      if (error) throw new ApiError('network', `Could not upload the photo: ${error.message}`, undefined, undefined, error);
      return `storage://business-media/${path}`;
    },

    // -- Submit ---------------------------------------------------------------------
    /** "Submit for review" (the server checks every step again). */
    submit: (listingId: string) => unwrap(db.rpc('submit_listing', { p_listing_id: listingId })),
  };
}

export type ListingEditorApi = ReturnType<typeof createListingEditorApi>;
export type EditorListing = NonNullable<Awaited<ReturnType<ListingEditorApi['get']>>>;
export type EditorStaffMember = Awaited<ReturnType<ListingEditorApi['listStaff']>>[number];
