import { router } from 'expo-router';

/** Open a business page. */
export const openBusiness = (slug: string) => router.push({ pathname: '/business/[slug]', params: { slug } });

/**
 * Top Hosts: a solo local host (business kind `host`) opens their business
 * page; a host who works for an operator opens the host profile.
 */
export function openHost(host: { id: string; business: { slug: string; kind: string } }) {
  if (host.business.kind === 'host') openBusiness(host.business.slug);
  else router.push({ pathname: '/host/[id]', params: { id: host.id } });
}
