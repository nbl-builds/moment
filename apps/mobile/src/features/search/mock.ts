// Mocks for Search until the backend supports them (see docs/ROADMAP.md,
// "To wire after UI"). Same signatures as the real calls will have.
import { api } from '@/lib/api';
import type { HostCardData } from '@/features/home/use-home-data';
import { CATEGORY_GROUPS, type SearchFilterState } from './filters';

/**
 * Which of these listings have availability between two dates.
 * MOCK: there is no availability search yet (slots and staff schedules exist,
 * but no RPC answers "free on these days"), so every listing counts as available.
 * Replace with the search RPC planned with Explore.
 */
export async function availableListingIds(listingIds: string[], _range: { from: string; to: string }): Promise<Set<string>> {
  return new Set(listingIds);
}

/**
 * Filters > Host on: hosts instead of experiences.
 * MOCK: there is no host search endpoint, so this loads the top hosts
 * (`api.catalog.topHosts`) and filters them on the device by name, category,
 * destination city, language and rating. Area, distance, price and dates are
 * ignored. Replace with a `search_hosts` RPC; the signature stays.
 */
export async function searchHosts(
  f: SearchFilterState,
  categories: { id: string; slug: string }[],
): Promise<HostCardData[]> {
  const hosts = await api.catalog.topHosts({ limit: 100 });
  const slugs = CATEGORY_GROUPS.filter((g) => f.categoryGroups.includes(g.key)).flatMap((g) => g.slugs);
  const categoryIds = new Set(categories.filter((c) => slugs.includes(c.slug)).map((c) => c.id));
  const q = f.query?.trim().toLowerCase() ?? '';

  return hosts.filter((h) => {
    const listings = h.listings.flatMap((l) => l.listing ?? []);
    if (q && !`${h.display_name} ${h.title ?? ''} ${h.business.name}`.toLowerCase().includes(q)) return false;
    if (categoryIds.size && !listings.some((l) => l.category_id && categoryIds.has(l.category_id))) return false;
    if (f.city && !listings.some((l) => l.city === f.city)) return false;
    if (f.language && !(h.languages ?? []).includes(f.language)) return false;
    if (f.minRating !== null && Number(h.rating_avg) < f.minRating) return false;
    return true;
  });
}
