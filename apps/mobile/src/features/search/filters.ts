import { formatPrice } from '@moment/shared';
import type { IconName } from '@/components/ui';

// Filters screen state (Figma "Search Filter", 22:1336). Kept as plain JSON so
// it can travel in route params between Filters and Search Results.

export interface SearchFilterState {
  /** Text typed on the Search screen. */
  query: string | null;
  /** "Host": show hosts instead of experiences. */
  hostedOnly: boolean;
  /** "Pick Category" chips, by key (see CATEGORY_GROUPS). */
  categoryGroups: string[];
  /** "Destination": a city, optionally narrowed to one of its areas. */
  city: string | null;
  area: string | null;
  /** "Distance": km from the user; null = any. Needs location. */
  maxDistanceKm: number | null;
  /** "Price Range": minimum and maximum, minor units (PKR paisa); null = open-ended. */
  minPrice: number | null;
  maxPrice: number | null;
  /** "Rating": minimum stars; null = any. */
  minRating: number | null;
  /** "Date": YYYY-MM-DD range. */
  dates: { from: string; to: string } | null;
  /** "Language": ISO code (en, ur, ...). */
  language: string | null;
}

export const EMPTY_FILTERS: SearchFilterState = {
  query: null,
  hostedOnly: false,
  categoryGroups: [],
  city: null,
  area: null,
  maxDistanceKm: null,
  minPrice: null,
  maxPrice: null,
  minRating: null,
  dates: null,
  language: null,
};

/**
 * Figma's seven chips, each covering one or more catalogue categories.
 * Order and widths follow the design: three per row, Health & Wellness alone.
 */
export const CATEGORY_GROUPS: { key: string; label: string; icon: IconName; slugs: string[] }[] = [
  { key: 'adventure', label: 'Adventure', icon: 'category-adventure', slugs: ['outdoor-adventure'] },
  { key: 'tours', label: 'Tours', icon: 'category-tours-solid', slugs: ['tours-walks', 'day-trips'] },
  { key: 'food', label: 'Food', icon: 'category-food', slugs: ['food-drink'] },
  { key: 'entertainment', label: 'Entertainment', icon: 'category-entertainment', slugs: ['water-activities'] },
  { key: 'art', label: 'Art & Culture', icon: 'category-art', slugs: ['arts-workshops'] },
  { key: 'beauty', label: 'Beauty', icon: 'category-beauty', slugs: ['hair', 'nails', 'grooming', 'skin-care'] },
  { key: 'wellness', label: 'Health & Wellness', icon: 'category-wellness', slugs: ['spa-massage'] },
];

/**
 * What a host does, for host cards: the chip label of the category most of
 * their experiences are in ("Adventure", "Food", ...).
 */
export function hostCategoryLabel(
  host: { listings: { listing: { category_id: string | null } | null }[] },
  categories: { id: string; slug: string }[],
): string | null {
  const counts = new Map<string, number>();
  for (const { listing } of host.listings) {
    const slug = categories.find((c) => c.id === listing?.category_id)?.slug;
    const group = CATEGORY_GROUPS.find((g) => slug && g.slugs.includes(slug));
    if (group) counts.set(group.label, (counts.get(group.label) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Home "More to explore" chips open results for the group holding that category. */
export const groupForCategorySlug = (slug: string) => CATEGORY_GROUPS.find((g) => g.slugs.includes(slug))?.key ?? null;

/** Destinations with listings today: launch cities and their areas (business location `area`). */
export const DESTINATIONS: { city: string; areas: string[] }[] = [
  { city: 'Islamabad', areas: ['F-6', 'F-7 Markaz', 'Rawal Town'] },
  { city: 'Lahore', areas: ['Androon Shehar', 'Gulberg III', 'Model Town'] },
  { city: 'Karachi', areas: ['DHA Phase 6', 'Kiamari', 'Saddar'] },
  { city: 'Hunza', areas: ['Karimabad'] },
];

/** Picker value for a destination: "Lahore" or "Lahore|Gulberg III". */
export const destinationValue = (city: string, area: string | null) => (area ? `${city}|${area}` : city);
export function parseDestination(value: string | null): { city: string | null; area: string | null } {
  if (!value) return { city: null, area: null };
  const [city, area] = value.split('|');
  return { city: city ?? null, area: area ?? null };
}
export const destinationLabel = (f: Pick<SearchFilterState, 'city' | 'area'>) =>
  f.city ? (f.area ? `${f.area}, ${f.city}` : f.city) : null;
export const DESTINATION_OPTIONS = DESTINATIONS.flatMap(({ city, areas }) => [
  { value: city, label: city },
  ...areas.map((area) => ({ value: destinationValue(city, area), label: `${area}, ${city}` })),
]);

/** Languages hosts speak (listing `languages` codes). */
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'Urdu' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'sd', label: 'Sindhi' },
  { code: 'ps', label: 'Pashto' },
  { code: 'bal', label: 'Balochi' },
  { code: 'bsk', label: 'Burushaski' },
];

/** Slider ranges (Figma shows miles and $; Pakistan uses km and PKR). */
export const DISTANCE = { min: 1, max: 50, step: 1 } as const;
export const PRICE = { min: 50000, max: 2000000, step: 50000 } as const; // Rs 500 .. Rs 20,000
export const RATING = { min: 1, max: 5, step: 1 } as const;

export const distanceLabel = (km: number | null) => (km === null ? 'Any distance' : `Within ${km} km`);
export function priceLabel(min: number | null, max: number | null) {
  if (min === null && max === null) return 'Any price';
  if (min === null) return `Up to ${formatPrice(max as number)}`;
  if (max === null) return `${formatPrice(min)}+`;
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}
export const ratingLabel = (stars: number | null) =>
  stars === null ? 'Any rating' : stars === 5 ? '5 Stars' : `${stars} Star${stars === 1 ? '' : 's'} & up`;

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${SHORT_MONTHS[Number(d.slice(5, 7)) - 1]}`;
export const datesLabel = (dates: SearchFilterState['dates']) =>
  dates ? (dates.from === dates.to ? shortDate(dates.from) : `${shortDate(dates.from)} – ${shortDate(dates.to)}`) : null;
export const languageLabel = (code: string | null) => LANGUAGES.find((l) => l.code === code)?.label ?? null;

/** Removable chips on Search Results, one per active filter. */
export function activeFilterChips(f: SearchFilterState): { key: string; label: string; clear: (f: SearchFilterState) => SearchFilterState }[] {
  const chips: ReturnType<typeof activeFilterChips> = [];
  if (f.query) chips.push({ key: 'query', label: `“${f.query}”`, clear: (s) => ({ ...s, query: null }) });
  if (f.hostedOnly) chips.push({ key: 'host', label: 'Host', clear: (s) => ({ ...s, hostedOnly: false }) });
  for (const key of f.categoryGroups) {
    const group = CATEGORY_GROUPS.find((g) => g.key === key);
    if (group) {
      chips.push({ key: `cat-${key}`, label: group.label, clear: (s) => ({ ...s, categoryGroups: s.categoryGroups.filter((k) => k !== key) }) });
    }
  }
  const destination = destinationLabel(f);
  if (destination) chips.push({ key: 'city', label: destination, clear: (s) => ({ ...s, city: null, area: null }) });
  if (f.maxDistanceKm !== null) chips.push({ key: 'distance', label: distanceLabel(f.maxDistanceKm), clear: (s) => ({ ...s, maxDistanceKm: null }) });
  if (f.minPrice !== null || f.maxPrice !== null) {
    chips.push({ key: 'price', label: priceLabel(f.minPrice, f.maxPrice), clear: (s) => ({ ...s, minPrice: null, maxPrice: null }) });
  }
  if (f.minRating !== null) chips.push({ key: 'rating', label: ratingLabel(f.minRating), clear: (s) => ({ ...s, minRating: null }) });
  const dates = datesLabel(f.dates);
  if (dates) chips.push({ key: 'dates', label: dates, clear: (s) => ({ ...s, dates: null }) });
  const language = languageLabel(f.language);
  if (language) chips.push({ key: 'language', label: language, clear: (s) => ({ ...s, language: null }) });
  return chips;
}

/** How many filters are set (the badge on filter icons). The search text does not count. */
export const activeFilterCount = (f: SearchFilterState) => activeFilterChips(f).filter((c) => c.key !== 'query').length;

export const encodeFilters = (f: SearchFilterState) => JSON.stringify(f);

export function decodeFilters(raw: string | string[] | undefined): SearchFilterState {
  if (typeof raw !== 'string') return EMPTY_FILTERS;
  try {
    return { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<SearchFilterState>) };
  } catch {
    return EMPTY_FILTERS;
  }
}
