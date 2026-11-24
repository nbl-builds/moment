import { formatPrice } from '@moment/shared';
import type { IconName } from '@/components/ui';

// Filters screen state (Figma "Search Filter", 22:1336). Kept as plain JSON so
// it can travel in route params between Filters and Search Results.

export interface SearchFilterState {
  /** "Host": only listings with a local host. */
  hostedOnly: boolean;
  /** "Pick Category" chips, by key (see CATEGORY_GROUPS). */
  categoryGroups: string[];
  /** "Destination": a city. */
  city: string | null;
  /** "Distance": km from the user; null = any. Needs location. */
  maxDistanceKm: number | null;
  /** "Price Range": maximum, minor units (PKR paisa); null = any. */
  maxPrice: number | null;
  /** "Rating": minimum stars; null = any. */
  minRating: number | null;
  /** "Date": YYYY-MM-DD range. */
  dates: { from: string; to: string } | null;
  /** "Language": ISO code (en, ur, ...). */
  language: string | null;
}

export const EMPTY_FILTERS: SearchFilterState = {
  hostedOnly: false,
  categoryGroups: [],
  city: null,
  maxDistanceKm: null,
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

/** Home "More to explore" chips open results for the group holding that category. */
export const groupForCategorySlug = (slug: string) => CATEGORY_GROUPS.find((g) => g.slugs.includes(slug))?.key ?? null;

/** Destinations with listings today. */
export const DESTINATIONS = ['Islamabad', 'Lahore', 'Karachi', 'Hunza'] as const;

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
export const priceLabel = (minor: number | null) => (minor === null ? 'Any price' : `Up to ${formatPrice(minor)}`);
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
  if (f.hostedOnly) chips.push({ key: 'host', label: 'Host', clear: (s) => ({ ...s, hostedOnly: false }) });
  for (const key of f.categoryGroups) {
    const group = CATEGORY_GROUPS.find((g) => g.key === key);
    if (group) {
      chips.push({ key: `cat-${key}`, label: group.label, clear: (s) => ({ ...s, categoryGroups: s.categoryGroups.filter((k) => k !== key) }) });
    }
  }
  if (f.city) chips.push({ key: 'city', label: f.city, clear: (s) => ({ ...s, city: null }) });
  if (f.maxDistanceKm !== null) chips.push({ key: 'distance', label: distanceLabel(f.maxDistanceKm), clear: (s) => ({ ...s, maxDistanceKm: null }) });
  if (f.maxPrice !== null) chips.push({ key: 'price', label: priceLabel(f.maxPrice), clear: (s) => ({ ...s, maxPrice: null }) });
  if (f.minRating !== null) chips.push({ key: 'rating', label: ratingLabel(f.minRating), clear: (s) => ({ ...s, minRating: null }) });
  const dates = datesLabel(f.dates);
  if (dates) chips.push({ key: 'dates', label: dates, clear: (s) => ({ ...s, dates: null }) });
  const language = languageLabel(f.language);
  if (language) chips.push({ key: 'language', label: language, clear: (s) => ({ ...s, language: null }) });
  return chips;
}

export const encodeFilters = (f: SearchFilterState) => JSON.stringify(f);

export function decodeFilters(raw: string | string[] | undefined): SearchFilterState {
  if (typeof raw !== 'string') return EMPTY_FILTERS;
  try {
    return { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<SearchFilterState>) };
  } catch {
    return EMPTY_FILTERS;
  }
}
