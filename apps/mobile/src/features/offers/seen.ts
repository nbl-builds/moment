import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useOffers } from '@/features/profile/queries';
import { queryClient } from '@/lib/query-client';

// Offers row badge on Profile: coupons the user hasn't seen on /offers yet.
// The public coupons select has no created_at, so we remember the coupon ids
// seen on this device instead of a "last seen" time.

const KEY = 'moment.seenOfferIds';
const SEEN_QUERY_KEY = ['offers', 'seen-ids'] as const;

async function getSeenOfferIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Call when /offers shows these coupons. */
export async function markOffersSeen(ids: string[]): Promise<void> {
  const seen = new Set(await getSeenOfferIds());
  if (ids.every((id) => seen.has(id))) return;
  // Only keep ids still on offer, so the list doesn't grow forever.
  const next = [...new Set(ids)];
  queryClient.setQueryData(SEEN_QUERY_KEY, next);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

/** New coupons since /offers was last opened; all of them if it never was. */
export function useNewOffersCount(): number {
  const offers = useOffers();
  const seen = useQuery({ queryKey: SEEN_QUERY_KEY, queryFn: getSeenOfferIds, staleTime: Infinity });
  if (!offers.data || !seen.data) return 0;
  const seenIds = new Set(seen.data);
  return offers.data.filter((c) => !seenIds.has(c.id)).length;
}
