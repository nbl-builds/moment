import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

export type BookingRow = Awaited<ReturnType<typeof api.bookings.listMine>>[number];
export type BookingDetail = Awaited<ReturnType<typeof api.bookings.get>>;
export type UnreadRow = Awaited<ReturnType<typeof api.bookings.unreadByBusiness>>[number];

export const bookingsKeys = {
  all: ['bookings'] as const,
  list: (userId: string | undefined, when: 'upcoming' | 'all') => ['bookings', 'list', userId, when] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
  unread: (userId: string | undefined) => ['bookings', 'unread', userId] as const,
};

/** Active bookings (pending / confirmed, not yet over), soonest first. */
export function useActiveBookings() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: bookingsKeys.list(userId, 'upcoming'),
    queryFn: () => api.bookings.listMine({ when: 'upcoming', limit: 100 }),
    enabled: Boolean(userId),
  });
}

/** Every booking, newest first (All Bookings). */
export function useBookingHistory() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: bookingsKeys.list(userId, 'all'),
    queryFn: () => api.bookings.listMine({ when: 'all', limit: 300 }),
    enabled: Boolean(userId),
  });
}

/** One reservation. Waits for the session (RLS hides bookings from guests). */
export function useBooking(id: string | undefined) {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: [...bookingsKeys.detail(id ?? ''), userId],
    queryFn: () => api.bookings.get(id as string),
    enabled: Boolean(id) && Boolean(userId),
  });
}

/** Unread chat messages per business (badges), for the signed-in user. */
export function useUnread() {
  const userId = useSession()?.user.id;
  const q = useQuery({
    queryKey: bookingsKeys.unread(userId),
    queryFn: () => api.bookings.unreadByBusiness(),
    enabled: Boolean(userId),
  });
  const byBusiness = new Map<string, number>();
  for (const r of q.data ?? []) if (r.business_id) byBusiness.set(r.business_id, (byBusiness.get(r.business_id) ?? 0) + r.unread);
  const total = [...byBusiness.values()].reduce((a, b) => a + b, 0);
  return { ...q, byBusiness, total, conversationOf: (businessId: string) => q.data?.find((r) => r.business_id === businessId)?.conversation_id };
}

/**
 * Keeps bookings and unread badges live: listens on the private `user:<id>`
 * channel and refetches what changed. Mount once (tabs layout).
 */
export function useLiveBookings() {
  const userId = useSession()?.user.id;
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    return api.bookings.subscribeMine(userId, {
      booking: (e) => {
        void queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] });
        void queryClient.invalidateQueries({ queryKey: bookingsKeys.detail(e.booking_id) });
      },
      message: () => {
        void queryClient.invalidateQueries({ queryKey: ['bookings', 'unread'] });
      },
    });
  }, [userId, queryClient]);
}
