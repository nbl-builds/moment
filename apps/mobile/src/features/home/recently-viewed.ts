import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/lib/query-client';

// "Recently viewed" on Home: listings opened on this device, newest first.
// Stored on the device for now (no account needed); move to the server when
// it should follow the user across devices.

const KEY = 'moment.recentlyViewed';
const MAX = 10;
export const RECENTLY_VIEWED_QUERY_KEY = ['recently-viewed-ids'] as const;

export async function getRecentlyViewedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Call when a listing opens. */
export async function recordListingView(listingId: string): Promise<void> {
  const ids = await getRecentlyViewedIds();
  const next = [listingId, ...ids.filter((id) => id !== listingId)].slice(0, MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
  await queryClient.invalidateQueries({ queryKey: RECENTLY_VIEWED_QUERY_KEY });
}
