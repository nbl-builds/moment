import type { NotificationPrefs, PersonalInfo } from '../validation/profile';
import { toDisplayName } from '../validation/profile';
import { ApiError, requireUserId, unwrap, unwrapRequired, type MomentSupabaseClient } from './errors';

export function createProfileApi(db: MomentSupabaseClient) {
  return {
    /** Profile screen: public card, private details and current badge. */
    getMe: async () => {
      const userId = await requireUserId(db);
      const [profile, details] = await Promise.all([
        unwrapRequired(
          db
            .from('profiles')
            .select('*, badge:badges!profiles_personality_badge_fk(id, code, name, description, icon)')
            .eq('id', userId)
            .maybeSingle(),
          'Profile',
        ),
        unwrap(db.from('profile_private').select('*').eq('user_id', userId).maybeSingle()),
      ]);
      return { profile, private: details };
    },

    /** Public profile (review authors, group members, hosts linked to a user). */
    getProfile: (userId: string) =>
      unwrapRequired(
        db.from('profiles').select('id, display_name, avatar_url, bio, home_city, personality_badge_id').eq('id', userId).maybeSingle(),
        'Profile',
      ),

    /** "Personal Information" > Save. */
    updatePersonalInfo: async (form: PersonalInfo) => {
      const userId = await requireUserId(db);
      return unwrapRequired(
        db
          .from('profiles')
          .update({
            display_name: toDisplayName(form.firstName, form.lastName),
            bio: form.bio ?? null,
            home_city: form.homeCity ?? null,
          })
          .eq('id', userId)
          .select()
          .maybeSingle(),
        'Profile',
      );
    },

    /**
     * Uploads a profile photo to `avatars/<user_id>/...` and saves it on the
     * profile as a storage ref (`api.media.url` resolves it). Returns the ref.
     */
    uploadAvatar: async (file: { body: ArrayBuffer; contentType: string; extension: string }) => {
      const userId = await requireUserId(db);
      const path = `${userId}/avatar-${Date.now()}.${file.extension}`;
      const { error } = await db.storage.from('avatars').upload(path, file.body, { contentType: file.contentType });
      if (error) throw new ApiError('network', `Could not upload the photo: ${error.message}`, undefined, undefined, error);
      const ref = `storage://avatars/${path}`;
      await unwrap(db.from('profiles').update({ avatar_url: ref }).eq('id', userId));
      return ref;
    },

    /** Upload to the `avatars` bucket (`<user_id>/...`) first, then save the public URL here. */
    updateAvatar: async (avatarUrl: string | null) => {
      const userId = await requireUserId(db);
      return unwrap(db.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId));
    },

    updateNotificationPrefs: async (prefs: NotificationPrefs) => {
      const userId = await requireUserId(db);
      return unwrap(db.from('profile_private').update({ notification_prefs: prefs }).eq('user_id', userId));
    },

    updateLocale: async (locale: string) => {
      const userId = await requireUserId(db);
      return unwrap(db.from('profile_private').update({ locale }).eq('user_id', userId));
    },
  };
}
