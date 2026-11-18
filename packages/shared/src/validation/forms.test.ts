import { describe, expect, it } from 'vitest';
import { bucketListItemSchema, recommendPlaceSchema, searchFiltersSchema } from './discovery';
import { personalInfoSchema, splitDisplayName, toDisplayName } from './profile';
import {
  createGroupSchema,
  feedbackSchema,
  quizSubmissionSchema,
  renameGroupSchema,
  reviewSchema,
  sendMessageSchema,
} from './social';

const ID = '7b0c4a39-5d8e-4f7a-9b3c-2a1d0e6f8c45';
const ID2 = 'c2d9e8f1-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

describe('search filters', () => {
  it('applies defaults', () => {
    expect(searchFiltersSchema.parse({})).toEqual({ sort: 'recommended', limit: 20, offset: 0 });
  });

  it('coerces URL query params', () => {
    const parsed = searchFiltersSchema.parse({ priceMin: '100000', priceMax: '500000', minRating: '4', limit: '10' });
    expect(parsed).toMatchObject({ priceMin: 100000, priceMax: 500000, minRating: 4, limit: 10 });
  });

  it('validates ranges', () => {
    expect(searchFiltersSchema.safeParse({ priceMin: 5000, priceMax: 1000 }).error?.issues[0]?.path).toEqual(['priceMax']);
    expect(searchFiltersSchema.safeParse({ minRating: 6 }).success).toBe(false);
    expect(searchFiltersSchema.safeParse({ sort: 'distance' }).error?.issues[0]?.message).toBe(
      'Turn on location to sort by distance',
    );
    expect(searchFiltersSchema.safeParse({ sort: 'distance', near: { lat: 33.7, lng: 73.0 } }).success).toBe(true);
  });
});

describe('recommend a place', () => {
  it('parses the Recommend a service form', () => {
    expect(
      recommendPlaceSchema.parse({
        kind: 'service',
        name: '  Kohsar Market Barber ',
        city: 'Islamabad',
        contactPhone: '051 2345678',
        note: '',
      }),
    ).toEqual({
      kind: 'service',
      name: 'Kohsar Market Barber',
      city: 'Islamabad',
      contactPhone: '+92512345678',
      address: undefined,
      note: undefined,
    });
  });

  it('requires kind, name and city', () => {
    const result = recommendPlaceSchema.safeParse({ name: 'X', city: '' });
    const messages = result.error?.issues.map((i) => i.message);
    expect(messages).toContain('Pick what kind of service this is');
    expect(messages).toContain('Name must be at least 2 characters');
    expect(messages).toContain('City is required');
  });
});

describe('bucket list', () => {
  it('needs exactly one target', () => {
    expect(bucketListItemSchema.safeParse({ listingId: ID }).success).toBe(true);
    expect(bucketListItemSchema.safeParse({ businessId: ID }).success).toBe(true);
    expect(bucketListItemSchema.safeParse({}).success).toBe(false);
    expect(bucketListItemSchema.safeParse({ listingId: ID, businessId: ID2 }).success).toBe(false);
  });
});

describe('profile', () => {
  it('joins and splits names', () => {
    expect(toDisplayName(' Nabeel ', 'Ahmed ')).toBe('Nabeel Ahmed');
    expect(splitDisplayName('Muhammad Ali Khan')).toEqual({ firstName: 'Muhammad Ali', lastName: 'Khan' });
    expect(splitDisplayName('Ayesha')).toEqual({ firstName: 'Ayesha', lastName: '' });
    expect(splitDisplayName('')).toEqual({ firstName: '', lastName: '' });
  });

  it('validates Personal Information', () => {
    expect(personalInfoSchema.parse({ firstName: 'Nabeel', lastName: 'Ahmed', bio: '' })).toEqual({
      firstName: 'Nabeel',
      lastName: 'Ahmed',
      bio: undefined,
      homeCity: undefined,
    });
    expect(personalInfoSchema.safeParse({ firstName: 'Nabeel', lastName: 'Ahmed', bio: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('reviews', () => {
  it('requires a 1-5 star rating', () => {
    expect(reviewSchema.parse({ bookingId: ID, rating: 5 })).toEqual({ bookingId: ID, rating: 5, body: undefined, photos: [] });
    expect(reviewSchema.safeParse({ bookingId: ID, rating: 0 }).error?.issues[0]?.message).toBe('Pick a rating');
    expect(reviewSchema.safeParse({ bookingId: ID, rating: 4.5 }).success).toBe(false);
    expect(reviewSchema.safeParse({ bookingId: ID, rating: 4, photos: ['ftp://x'] }).success).toBe(false);
  });
});

describe('groups', () => {
  it('parses Create new group with defaults', () => {
    expect(createGroupSchema.parse({ name: 'Hunza Trip', description: 'Road trip in May' })).toMatchObject({
      name: 'Hunza Trip',
      description: 'Road trip in May',
      visibility: 'private',
      isOpenToMatch: false,
      maxMembers: 12,
      interestTagIds: [],
    });
  });

  it('validates names and dates', () => {
    expect(renameGroupSchema.safeParse({ name: 'A' }).error?.issues[0]?.message).toBe(
      'Group name must be at least 2 characters',
    );
    expect(
      createGroupSchema.safeParse({ name: 'Trip', startDate: '2026-05-10', endDate: '2026-05-01' }).error?.issues[0]?.path,
    ).toEqual(['endDate']);
    expect(createGroupSchema.safeParse({ name: 'Trip', maxMembers: 1 }).success).toBe(false);
  });
});

describe('chat and support', () => {
  it('needs text or an attachment', () => {
    expect(sendMessageSchema.safeParse({ conversationId: ID, body: '  ' }).error?.issues[0]?.message).toBe('Type a message');
    expect(sendMessageSchema.safeParse({ conversationId: ID, attachments: [{ path: `${ID}/photo.jpg` }] }).success).toBe(true);
    expect(sendMessageSchema.parse({ conversationId: ID, body: ' Salam! ' }).body).toBe('Salam!');
  });

  it('validates Give us feedback', () => {
    expect(feedbackSchema.safeParse({ topic: 'app', message: 'The map is great but slow to load.' }).success).toBe(true);
    expect(feedbackSchema.safeParse({ message: 'The map is great.' }).error?.issues[0]?.message).toBe('Pick a topic');
    expect(feedbackSchema.safeParse({ topic: 'app', message: 'meh' }).success).toBe(false);
  });

  it('validates quiz submissions', () => {
    expect(quizSubmissionSchema.safeParse({ answerIds: [ID, ID2] }).success).toBe(true);
    expect(quizSubmissionSchema.safeParse({ answerIds: [ID, ID] }).success).toBe(false);
    expect(quizSubmissionSchema.safeParse({ answerIds: [] }).success).toBe(false);
  });
});
