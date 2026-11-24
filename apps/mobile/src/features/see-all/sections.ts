import { api } from '@/lib/api';
import type { HostCardData, ListingCardData } from '@/features/home/use-home-data';
import { getRecentlyViewedIds } from '@/features/home/recently-viewed';

// Home "See all" screens (Figma 18:1085, 20:1479, 20:1676, 20:1897). Local fun,
// Must-trys and Recently viewed have no frame and reuse the list layout.

const LIMIT = 50;

type ListingSection = {
  kind: 'listings';
  title: string;
  /** 'wide': Popular (392pt cards). 'wideShort': Just For You / Explore (304pt). */
  card: 'wide' | 'wideShort';
  load: (city: string | undefined) => Promise<ListingCardData[]>;
};
type HostSection = {
  kind: 'hosts';
  title: string;
  load: () => Promise<HostCardData[]>;
};
export type SeeAllSection = ListingSection | HostSection;

export const SEE_ALL_SECTIONS = {
  popular: {
    kind: 'listings',
    title: 'Popular activities',
    card: 'wide',
    load: async (city) => {
      const inCity = await api.catalog.popularActivities({ city, limit: LIMIT });
      return city && inCity.length < 3 ? api.catalog.popularActivities({ limit: LIMIT }) : inCity;
    },
  },
  hosts: { kind: 'hosts', title: 'Top Hosts', load: () => api.catalog.topHosts({ limit: LIMIT }) },
  'for-you': {
    kind: 'listings',
    title: 'Just For You',
    card: 'wideShort',
    load: (city) => api.catalog.justForYou({ city, limit: LIMIT }),
  },
  explore: {
    kind: 'listings',
    title: 'Explore',
    card: 'wideShort',
    load: async () => (await api.catalog.searchListings({ type: 'experience', sort: 'recommended', limit: LIMIT, offset: 0 })).items,
  },
  'local-fun': {
    kind: 'listings',
    title: 'Local fun',
    card: 'wide',
    load: (city) => api.catalog.curated({ tag: 'local-fun', city, limit: LIMIT }),
  },
  'must-try': {
    kind: 'listings',
    title: 'Must-trys',
    card: 'wide',
    load: (city) => api.catalog.curated({ tag: 'must-try', city, limit: LIMIT }),
  },
  recent: {
    kind: 'listings',
    title: 'Recently viewed',
    card: 'wide',
    load: async () => api.catalog.listingsByIds(await getRecentlyViewedIds()),
  },
} satisfies Record<string, SeeAllSection>;

export type SeeAllKey = keyof typeof SEE_ALL_SECTIONS;
export const isSeeAllKey = (key: string | undefined): key is SeeAllKey => key !== undefined && key in SEE_ALL_SECTIONS;
