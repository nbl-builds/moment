import { z } from 'zod';
import { LIMITS } from '../constants';
import { localDateSchema, optionalPkPhoneSchema, optionalText, requiredText, uuidSchema } from './common';

// Figma: "Search Filter", "Search Filter Long", "Add loc" (Explore filters),
// "Recommend a service", "Bucket List".

export const SEARCH_SORTS = ['recommended', 'popular', 'rating', 'price_low', 'price_high', 'distance'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

/**
 * Search and Explore filters. Prices are minor units; distance is kilometres.
 * Every field is optional so the schema also parses URL query params on web.
 */
export const searchFiltersSchema = z
  .object({
    query: optionalText(LIMITS.searchQuery, 'Search'),
    /** Explore tabs: Experiences / Businesses (`service` listings). */
    type: z.enum(['experience', 'service']).optional(),
    categoryId: uuidSchema.optional(),
    /** Several categories at once (a Filters chip such as "Beauty" covers hair, nails, ...). */
    categoryIds: z.array(uuidSchema).max(20).optional(),
    /** Filters > "Host": only listings with a local host. */
    hostedOnly: z.boolean().optional(),
    city: optionalText(80, 'City'),
    near: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .optional(),
    date: localDateSchema.optional(),
    language: optionalText(40, 'Language'),
    /** "Top Host" / "Host" filter. */
    hostId: uuidSchema.optional(),
    maxDistanceKm: z.coerce.number().positive().max(500).optional(),
    priceMin: z.coerce.number().int().min(0).optional(),
    priceMax: z.coerce.number().int().min(0).optional(),
    minRating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z.enum(SEARCH_SORTS).default('recommended'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((f) => f.priceMin === undefined || f.priceMax === undefined || f.priceMin <= f.priceMax, {
    message: 'Minimum price must be below maximum price',
    path: ['priceMax'],
  })
  .refine((f) => f.sort !== 'distance' || f.near !== undefined, {
    message: 'Turn on location to sort by distance',
    path: ['sort'],
  });

export type SearchFiltersInput = z.input<typeof searchFiltersSchema>;
export type SearchFilters = z.output<typeof searchFiltersSchema>;

/**
 * "Recommend a service". `kind` is "Things to do (Moment experience)" or
 * "Business services (Moment Business)" and narrows the category picker.
 */
export const recommendPlaceSchema = z.object({
  kind: z.enum(['experience', 'service'], { message: 'Pick what kind of service this is' }),
  name: requiredText('Name', LIMITS.recommendationName),
  categoryId: uuidSchema.optional(),
  city: requiredText('City', { max: 80 }),
  address: optionalText(200, 'Address'),
  contactPhone: optionalPkPhoneSchema,
  note: optionalText(LIMITS.recommendationNote, 'Notes'),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});

export type RecommendPlaceInput = z.input<typeof recommendPlaceSchema>;
export type RecommendPlace = z.output<typeof recommendPlaceSchema>;

/** Saving to the Bucket List: exactly one of a listing or a business. */
export const bucketListItemSchema = z
  .object({
    listingId: uuidSchema.optional(),
    businessId: uuidSchema.optional(),
    note: optionalText(LIMITS.bucketListNote, 'Note'),
  })
  .refine((v) => (v.listingId ? 1 : 0) + (v.businessId ? 1 : 0) === 1, {
    message: 'Save either an experience or a business',
    path: ['listingId'],
  });

export type BucketListItemForm = z.output<typeof bucketListItemSchema>;
