import { router } from 'expo-router';

/** Open a business page (optionally on its Services tab). */
export const openBusiness = (slug: string, tab?: 'services') =>
  router.push({ pathname: '/business/[slug]', params: tab ? { slug, tab } : { slug } });

/** Top Hosts, "Hosted by" and host rows: the Host Profile. */
export function openHost(host: { id: string }) {
  router.push({ pathname: '/host/[id]', params: { id: host.id } });
}

/**
 * Any listing card: experiences open Experience details; services have no
 * page of their own, so they open their business on the Services tab.
 */
export function openListing(listing: { id: string; type?: string | null; business?: { slug: string } | null }) {
  if (listing.type === 'service' && listing.business) openBusiness(listing.business.slug, 'services');
  else router.push({ pathname: '/experience/[id]', params: { id: listing.id } });
}
