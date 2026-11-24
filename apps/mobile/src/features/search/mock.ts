// Mocks for Search until the backend supports them (see docs/ROADMAP.md,
// "To wire after UI"). Same signature as the real call will have.

/**
 * Which of these listings have availability between two dates.
 * MOCK: there is no availability search yet (slots and staff schedules exist,
 * but no RPC answers "free on these days"), so every listing counts as available.
 * Replace with the search RPC planned with Explore.
 */
export async function availableListingIds(listingIds: string[], _range: { from: string; to: string }): Promise<Set<string>> {
  return new Set(listingIds);
}
