import { distanceKm } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/use-session';
import { useUserPlace } from '@/features/home/use-user-place';
import { api } from '@/lib/api';

export type Business = Awaited<ReturnType<typeof api.catalog.getBusiness>>;
export type BusinessService = Awaited<ReturnType<typeof api.catalog.listBusinessServices>>[number];
export type BusinessListing = Awaited<ReturnType<typeof api.catalog.listBusinessListings>>[number];
export type BusinessReview = Awaited<ReturnType<typeof api.catalog.listReviews>>[number];
export type MembershipPlan = Business['plans'][number];

export const businessKeys = {
  page: (slug: string) => ['business', slug] as const,
  services: (id: string) => ['business', id, 'services'] as const,
  popular: (id: string) => ['business', id, 'popular'] as const,
  reviews: (id: string, rating: number | null) => ['business', id, 'reviews', rating] as const,
  reviewStats: (id: string) => ['business', id, 'review-stats'] as const,
  reviewable: (id: string, userId: string | undefined) => ['business', id, 'reviewable', userId] as const,
};

export function useBusiness(slug: string) {
  return useQuery({ queryKey: businessKeys.page(slug), queryFn: () => api.catalog.getBusiness(slug), enabled: Boolean(slug) });
}

/** Map pin and "4.1 km away" (only when we know where the user is). */
export function useBusinessLocation(businessId: string | undefined) {
  const { place } = useUserPlace();
  const points = useQuery({
    queryKey: ['business', businessId, 'points'],
    queryFn: () => api.catalog.businessLocationPoints(businessId as string),
    enabled: Boolean(businessId),
  });
  const point = points.data?.[0] ?? null;
  return {
    point,
    distanceKm: point && place.coords ? distanceKm(place.coords, point) : null,
  };
}

export function useBusinessServices(businessId: string | undefined) {
  return useQuery({
    queryKey: businessKeys.services(businessId ?? ''),
    queryFn: () => api.catalog.listBusinessServices(businessId as string),
    enabled: Boolean(businessId),
  });
}

/** "Most booked right now": all of the business's listings by bookings. */
export function useBusinessPopular(businessId: string | undefined) {
  return useQuery({
    queryKey: businessKeys.popular(businessId ?? ''),
    queryFn: () => api.catalog.listBusinessListings(businessId as string, { limit: 10 }),
    enabled: Boolean(businessId),
  });
}

export function useBusinessReviews(businessId: string | undefined, rating: number | null) {
  return useQuery({
    queryKey: businessKeys.reviews(businessId ?? '', rating),
    queryFn: () => api.catalog.listReviews({ businessId: businessId as string }, { rating: rating ?? undefined, limit: 30 }),
    enabled: Boolean(businessId),
  });
}

export function useReviewStats(businessId: string | undefined) {
  return useQuery({
    queryKey: businessKeys.reviewStats(businessId ?? ''),
    queryFn: () => api.catalog.reviewStats(businessId as string),
    enabled: Boolean(businessId),
  });
}

/** My visits here that I can still review (empty for guests). */
export function useReviewableBookings(businessId: string | undefined) {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: businessKeys.reviewable(businessId ?? '', userId),
    queryFn: () => api.reviews.reviewableBookings(businessId as string),
    enabled: Boolean(businessId) && Boolean(userId),
  });
}
