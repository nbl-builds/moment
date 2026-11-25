import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { getRecentlyViewedIds, RECENTLY_VIEWED_QUERY_KEY } from './recently-viewed';
import { useUserPlace } from './use-user-place';

export type ListingCardData = Awaited<ReturnType<typeof api.catalog.popularActivities>>[number];
export type HostCardData = Awaited<ReturnType<typeof api.catalog.topHosts>>[number];
export type CategoryData = Awaited<ReturnType<typeof api.catalog.listCategories>>[number];
export type ServiceBusinessData = Awaited<ReturnType<typeof api.catalog.servicesNearYou>>[number];

const RAIL = 10;

/**
 * Everything Home shows, from local Supabase through `api.*`:
 * - Popular activities: published experiences by popularity (in the user's city when known)
 * - Top Hosts: hosts by rating
 * - Services near you: service businesses, nearest first with location, else
 *   the user's city by rating; the quiz badge breaks ties
 * - More to explore: experience categories
 * - Recently viewed: listings opened on this device
 * - Local fun / Must-trys: curated tags in the user's city
 */
export function useHomeData() {
  const queryClient = useQueryClient();
  const { place, ready } = useUserPlace();
  const city = place.city ?? undefined;
  const [refreshing, setRefreshing] = useState(false);

  const recentIds = useQuery({ queryKey: RECENTLY_VIEWED_QUERY_KEY, queryFn: getRecentlyViewedIds });

  const [popular, hosts, services, categories, recent, localFun, mustTry] = useQueries({
    queries: [
      {
        queryKey: ['home', 'popular', city],
        queryFn: async () => {
          const inCity = await api.catalog.popularActivities({ city, limit: RAIL });
          // A city with few experiences still gets a full rail.
          return city && inCity.length < 3 ? api.catalog.popularActivities({ limit: RAIL }) : inCity;
        },
        enabled: ready,
      },
      { queryKey: ['home', 'hosts'], queryFn: () => api.catalog.topHosts({ limit: RAIL }) },
      {
        queryKey: ['home', 'services', place.coords?.lat, place.coords?.lng, city],
        queryFn: () => api.catalog.servicesNearYou({ near: place.coords, city, limit: RAIL }),
        enabled: ready,
      },
      { queryKey: ['home', 'categories'], queryFn: () => api.catalog.listCategories() },
      {
        queryKey: ['home', 'recent', recentIds.data],
        queryFn: () => api.catalog.listingsByIds(recentIds.data ?? []),
        enabled: recentIds.isSuccess,
      },
      {
        queryKey: ['home', 'local-fun', city],
        queryFn: () => api.catalog.curated({ tag: 'local-fun', city }),
        enabled: ready,
      },
      {
        queryKey: ['home', 'must-try', city],
        queryFn: () => api.catalog.curated({ tag: 'must-try', city }),
        enabled: ready,
      },
    ],
  });

  // Distances for every listing on screen, only when location is allowed.
  const popularData = popular.data;
  const recentData = recent.data;
  const listingIds = useMemo(
    () => [...new Set([popularData, recentData].flatMap((items) => (items ?? []).map((l) => l.id)))].sort(),
    [popularData, recentData],
  );
  const distances = useQuery({
    queryKey: ['home', 'distances', place.coords?.lat, place.coords?.lng, listingIds],
    queryFn: () => api.catalog.listingDistances(place.coords as { lat: number; lng: number }, listingIds),
    enabled: Boolean(place.coords) && listingIds.length > 0,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: RECENTLY_VIEWED_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['bucket-list-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['device-location'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return {
    city,
    popular,
    hosts,
    services,
    categories,
    recent,
    localFun,
    mustTry,
    distanceKm: (listingId: string) => distances.data?.get(listingId),
    refresh,
    refreshing,
  };
}
