import type { TablesUpdate } from '../types';
import { ApiError, requireUserId, unwrap, type MomentSupabaseClient } from './errors';

// Business portal Profile and Account Settings. RLS decides who can write:
// the business row and its locations are owner-only; opening hours and the
// gallery are owners and managers; the host card is the signed-in person's.

const name = (ext: string) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
export type UploadFile = { body: ArrayBuffer | Blob; contentType: string; extension: string };

export function createBusinessProfileApi(db: MomentSupabaseClient) {
  async function upload(bucket: 'business-media' | 'avatars', folder: string, file: UploadFile) {
    const path = `${folder}/${name(file.extension)}`;
    const { error } = await db.storage.from(bucket).upload(path, file.body, { contentType: file.contentType });
    if (error) throw new ApiError('network', `Could not upload the photo: ${error.message}`, undefined, undefined, error);
    return `storage://${bucket}/${path}`;
  }

  return {
    /** Profile page: the signed-in person, their host card for this business and how they sign in. */
    me: async (businessId: string) => {
      const userId = await requireUserId(db);
      const [{ data: auth }, profile, card] = await Promise.all([
        db.auth.getUser(),
        unwrap(db.from('profiles').select('id, display_name, avatar_url, bio, home_city, identity_verified_at, created_at').eq('id', userId).single()),
        unwrap(
          db
            .from('staff_members')
            .select('id, display_name, title, bio, avatar_url, cover_url, languages, is_host')
            .eq('business_id', businessId)
            .eq('user_id', userId)
            .maybeSingle(),
        ),
      ]);
      const user = auth.user;
      return {
        profile,
        card,
        email: user?.email ?? null,
        emailConfirmed: Boolean(user?.email_confirmed_at),
        phone: user?.phone ? `+${user.phone.replace(/^\+/, '')}` : null,
        phoneConfirmed: Boolean(user?.phone_confirmed_at),
        passwordChangedAt: (user?.user_metadata?.password_changed_at as string | undefined) ?? null,
        lastSignInAt: user?.last_sign_in_at ?? null,
        createdAt: user?.created_at ?? profile.created_at,
      };
    },

    /** "Edit profile": name, photo, bio, languages; also the host card guests see (created if missing). */
    saveProfile: async (args: { businessId: string; displayName: string; bio: string | null; languages: string[]; avatarUrl: string | null; coverUrl?: string | null }) => {
      const userId = await requireUserId(db);
      await unwrap(db.from('profiles').update({ display_name: args.displayName, bio: args.bio, avatar_url: args.avatarUrl }).eq('id', userId).select('id'));
      const existing = await unwrap(db.from('staff_members').select('id').eq('business_id', args.businessId).eq('user_id', userId).maybeSingle());
      const row = {
        display_name: args.displayName,
        bio: args.bio,
        languages: args.languages,
        avatar_url: args.avatarUrl,
        ...(args.coverUrl !== undefined ? { cover_url: args.coverUrl } : null),
      };
      return existing
        ? unwrap(db.from('staff_members').update(row).eq('id', existing.id).select('id').single())
        : unwrap(db.from('staff_members').insert({ ...row, business_id: args.businessId, user_id: userId, is_host: true }).select('id').single());
    },

    /** "Edit cover photo" on the profile (the host card's cover). */
    saveCover: async (args: { businessId: string; coverUrl: string }) => {
      const userId = await requireUserId(db);
      const existing = await unwrap(db.from('staff_members').select('id').eq('business_id', args.businessId).eq('user_id', userId).maybeSingle());
      if (existing) return unwrap(db.from('staff_members').update({ cover_url: args.coverUrl }).eq('id', existing.id).select('id').single());
      const profile = await unwrap(db.from('profiles').select('display_name, avatar_url, bio').eq('id', userId).single());
      return unwrap(
        db
          .from('staff_members')
          .insert({ business_id: args.businessId, user_id: userId, display_name: profile.display_name ?? 'Host', avatar_url: profile.avatar_url, bio: profile.bio, cover_url: args.coverUrl, is_host: true })
          .select('id')
          .single(),
      );
    },

    uploadAvatar: async (file: UploadFile) => upload('avatars', await requireUserId(db), file),
    uploadBusinessMedia: (businessId: string, folder: 'brand' | 'gallery' | 'staff', file: UploadFile) => upload('business-media', `${businessId}/${folder}`, file),

    /** Personal Information: name and city (profiles). */
    savePersonal: async (patch: { displayName?: string; homeCity?: string | null }) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('profiles')
          .update({
            ...(patch.displayName !== undefined ? { display_name: patch.displayName } : null),
            ...(patch.homeCity !== undefined ? { home_city: patch.homeCity } : null),
          })
          .eq('id', userId)
          .select('id'),
      );
    },

    // -- Business (feeds the app's business page) ------------------------------------
    business: async (businessId: string) => {
      const [business, locations, points, hours, photos] = await Promise.all([
        unwrap(db.from('businesses').select('id, name, kind, status, description, tagline, logo_url, cover_url, phone, email, website, created_at').eq('id', businessId).single()),
        unwrap(
          db
            .from('business_locations')
            .select('id, name, address_line1, area, city, province, postal_code, is_primary')
            .eq('business_id', businessId)
            .order('is_primary', { ascending: false }),
        ),
        unwrap(db.rpc('business_location_points', { p_business_id: businessId })),
        unwrap(db.from('business_hours').select('id, weekday, opens_at, closes_at').eq('business_id', businessId).order('weekday').order('opens_at')),
        unwrap(db.from('business_photos').select('id, url, alt, sort_order').eq('business_id', businessId).order('sort_order')),
      ]);
      const primary = locations[0] ?? null;
      const point = primary ? (points.find((p) => p.location_id === primary.id) ?? null) : null;
      return { business, location: primary, point: point ? { lat: point.lat, lng: point.lng } : null, hours, photos };
    },

    saveBusiness: (businessId: string, patch: Pick<TablesUpdate<'businesses'>, 'name' | 'description' | 'logo_url' | 'cover_url' | 'tagline'>) =>
      unwrap(db.from('businesses').update(patch).eq('id', businessId).select('id').single()),

    /** The primary address with its map pin (owners). */
    saveLocation: (args: { businessId: string; locationId: string | null; address: string; area: string | null; city: string; province: string | null; postalCode: string | null; pin: { lat: number; lng: number } | null }) => {
      const row = {
        business_id: args.businessId,
        name: 'Main',
        address_line1: args.address,
        area: args.area,
        city: args.city,
        province: args.province,
        postal_code: args.postalCode,
        is_primary: true,
        // PostgREST casts EWKT text to geography.
        geo: args.pin ? `SRID=4326;POINT(${args.pin.lng} ${args.pin.lat})` : null,
      } as TablesUpdate<'business_locations'> & { business_id: string; name: string; address_line1: string; city: string };
      return unwrap(
        args.locationId
          ? db.from('business_locations').update(row).eq('id', args.locationId).select('id').single()
          : db.from('business_locations').insert(row).select('id').single(),
      );
    },

    /** Replaces the opening hours (weekday 0 = Sunday). */
    saveHours: async (businessId: string, hours: { weekday: number; opens: string; closes: string }[]) => {
      await unwrap(db.from('business_hours').delete().eq('business_id', businessId).select('id'));
      if (!hours.length) return;
      await unwrap(
        db
          .from('business_hours')
          .insert(hours.map((h) => ({ business_id: businessId, weekday: h.weekday, opens_at: h.opens, closes_at: h.closes })))
          .select('id'),
      );
    },

    addPhoto: (businessId: string, url: string, sortOrder: number) =>
      unwrap(db.from('business_photos').insert({ business_id: businessId, url, sort_order: sortOrder }).select('id, url, alt, sort_order').single()),

    removePhoto: async (photo: { id: string; url: string }) => {
      await unwrap(db.from('business_photos').delete().eq('id', photo.id).select('id'));
      const m = /^storage:\/\/business-media\/(.+)$/.exec(photo.url);
      if (m) await db.storage.from('business-media').remove([m[1] as string]);
    },

    // -- Payments (owners) ---------------------------------------------------------------
    payoutAccounts: (businessId: string) =>
      unwrap(
        db
          .from('payout_accounts')
          .select('id, provider, account_title, bank_name, account_number_last4, iban_masked, is_default, verified_at, created_at')
          .eq('business_id', businessId)
          .order('is_default', { ascending: false }),
      ),

    payouts: (businessId: string) =>
      unwrap(
        db
          .from('payouts')
          .select('id, amount, currency, status, provider, provider_payout_ref, period_start, period_end, paid_at, created_at, account:payout_accounts(provider, bank_name, account_number_last4)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
      ),
  };
}

export type BusinessProfileApi = ReturnType<typeof createBusinessProfileApi>;
export type PortalMe = Awaited<ReturnType<BusinessProfileApi['me']>>;
export type PortalBusinessProfile = Awaited<ReturnType<BusinessProfileApi['business']>>;
export type PayoutRow = Awaited<ReturnType<BusinessProfileApi['payouts']>>[number];
export type PayoutAccountRow = Awaited<ReturnType<BusinessProfileApi['payoutAccounts']>>[number];
