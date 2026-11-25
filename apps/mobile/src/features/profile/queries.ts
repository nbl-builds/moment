import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

export const profileKeys = {
  notifications: (userId?: string) => ['notifications', userId] as const,
  unread: (userId?: string) => ['notifications', userId, 'unread'] as const,
  completedBookings: (userId?: string) => ['completed-bookings', userId] as const,
  settings: ['public-settings'] as const,
  offers: (userId?: string) => ['offers', userId] as const,
  savedCoupons: (userId?: string) => ['saved-coupons', userId] as const,
  paymentMethods: (userId?: string) => ['payment-methods', userId] as const,
  wallet: (userId?: string) => ['wallet', userId] as const,
  memberships: (userId?: string) => ['memberships', userId] as const,
};

/** Bell badge on the Profile tab. */
export function useUnreadCount() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileKeys.unread(userId),
    queryFn: () => api.account.notifications.unreadCount(),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export function useNotifications() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileKeys.notifications(userId),
    queryFn: () => api.account.notifications.list({ limit: 50 }),
    enabled: Boolean(userId),
  });
}

/** Adventure Quiz: "Retake Quiz?" unlocks after this many completed bookings. */
export const RETAKE_AFTER_BOOKINGS = 3;

export function useCompletedBookingCount() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileKeys.completedBookings(userId),
    queryFn: () => api.profile.completedBookingCount(),
    enabled: Boolean(userId),
  });
}

/** Public app config (referral reward, social links, support contact, store links). */
export interface AppSettings {
  referralReward: number;
  socialLinks: Partial<Record<'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'x', string>>;
  support: { email?: string; phone?: string; hours?: string };
  storeUrls: { ios?: string; android?: string };
}

export function useAppSettings() {
  return useQuery({
    queryKey: profileKeys.settings,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<AppSettings> => {
      const s = (await api.catalog.getPublicSettings()) as Record<string, unknown>;
      return {
        referralReward: typeof s['referrals.reward_amount'] === 'number' ? s['referrals.reward_amount'] : 50000,
        socialLinks: (s['app.social_links'] ?? {}) as AppSettings['socialLinks'],
        support: (s['app.support'] ?? {}) as AppSettings['support'],
        storeUrls: (s['app.store_urls'] ?? {}) as AppSettings['storeUrls'],
      };
    },
  });
}

/** Offers screen: public, active coupons. */
export function useOffers() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileKeys.offers(userId),
    queryFn: () => api.catalog.listPublicCoupons(),
    enabled: Boolean(userId),
  });
}

export function useSavedCoupons() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileKeys.savedCoupons(userId),
    queryFn: () => api.account.savedCoupons.list(),
    enabled: Boolean(userId),
  });
}

/** Invalidate everything a profile change can touch (Home reads `me` for the city). */
export function useRefreshProfile() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['me'] });
}
