import { searchFiltersSchema } from '@moment/shared';
import { api } from '@/lib/api';
import { CATEGORY_GROUPS, type SearchFilterState } from './filters';
import { availableListingIds } from './mock';

export type SearchResult = Awaited<ReturnType<typeof api.catalog.searchListings>>['items'][number];

export interface SearchPage {
  items: SearchResult[];
  /** Next offset, or null when there are no more. */
  nextOffset: number | null;
  distances: Map<string, number>;
}

const PAGE = 20;
/** With a distance or date filter the page is filtered on the device, so fetch more at once. */
const FILTERED_PAGE = 50;

/**
 * Search Results for the Filters screen. Category, city, price, rating,
 * language and Host go to `api.catalog.searchListings`; distance uses the real
 * `listing_distances`; date availability is a mock until the search RPC exists.
 */
export async function searchWithFilters(
  f: SearchFilterState,
  categories: { id: string; slug: string }[],
  coords: { lat: number; lng: number } | null,
  offset: number,
): Promise<SearchPage> {
  const slugs = CATEGORY_GROUPS.filter((g) => f.categoryGroups.includes(g.key)).flatMap((g) => g.slugs);
  const categoryIds = categories.filter((c) => slugs.includes(c.slug)).map((c) => c.id);
  const filteredOnDevice = (f.maxDistanceKm !== null && coords !== null) || f.dates !== null;
  const limit = filteredOnDevice ? FILTERED_PAGE : PAGE;

  const { items, total } = await api.catalog.searchListings(
    searchFiltersSchema.parse({
      hostedOnly: f.hostedOnly || undefined,
      categoryIds: categoryIds.length ? categoryIds : undefined,
      city: f.city ?? undefined,
      priceMax: f.maxPrice ?? undefined,
      minRating: f.minRating ?? undefined,
      language: f.language ?? undefined,
      sort: f.minRating !== null ? 'rating' : 'recommended',
      limit,
      offset,
    }),
  );

  const distances = coords
    ? await api.catalog.listingDistances(coords, items.map((l) => l.id))
    : new Map<string, number>();

  let kept = items;
  if (f.maxDistanceKm !== null && coords) {
    kept = kept.filter((l) => (distances.get(l.id) ?? Infinity) <= (f.maxDistanceKm as number));
  }
  if (f.dates) {
    const available = await availableListingIds(kept.map((l) => l.id), f.dates);
    kept = kept.filter((l) => available.has(l.id));
  }

  // Device-side filtering stops at one page; the search RPC will page these properly.
  const more = !filteredOnDevice && offset + items.length < total;
  return { items: kept, nextOffset: more ? offset + items.length : null, distances };
}
