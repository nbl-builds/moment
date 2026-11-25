// Runs the API client against a local Supabase with seed data.
//   pnpm db:reset && pnpm --filter @moment/shared test:integration
// Needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (see vitest.integration.config.ts).
// Creates a fresh consumer per run, so it can be re-run without a reset.
import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { ApiError, createMomentApi, type MomentApi } from '../../src/api';
import { upcomingLocalDates } from '../../src/format/datetime';
import type { Database } from '../../src/types';
import { completeSignUpWithPasswordSchema, createBookingSchema, createCartSchema, recommendPlaceSchema, searchFiltersSchema } from '../../src/validation';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

const SEED = {
  password: 'password123',
  consumer: 'hamza@moment.test',
  ownerMargalla: 'owner.margalla@moment.test',
  margallaBusiness: '00000000-0000-4000-b000-000000000001',
  sunriseHike: '00000000-0000-4000-e000-000000000001',
  sunriseHikeSlug: 'margalla-sunrise-hike',
  swedishMassage: '00000000-0000-4000-e000-000000000021',
  saffronSpa: '00000000-0000-4000-b000-000000000002',
  devUser: 'dev@moment.test',
};

const newApi = () =>
  createMomentApi(createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));

async function signedIn(email: string): Promise<MomentApi> {
  const api = newApi();
  await api.auth.signInWithPassword({ email, password: SEED.password });
  return api;
}

const expectApiError = async (promise: Promise<unknown>, code: ApiError['code'], message?: string | RegExp) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).code).toBe(code);
  if (message) expect((error as ApiError).message).toMatch(message);
};

const key8 = () => `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe.skipIf(!url || !key)('API client against local Supabase', () => {
  let anon: MomentApi;
  let me: MomentApi;
  let myEmail: string;

  beforeAll(async () => {
    anon = newApi();
    me = newApi();
    myEmail = `it.${Date.now()}@moment.test`;
    const { error } = await me.db.auth.signUp({ email: myEmail, password: 'moment2026' });
    if (error) throw error;
  });

  describe('discovery (signed out)', () => {
    it('lists popular activities with embeds', async () => {
      const items = await anon.catalog.popularActivities({ limit: 5 });
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]?.business.name).toBeTruthy();
      expect(items.every((i) => i.type === 'experience')).toBe(true);
    });

    it('loads the business page', async () => {
      const biz = await anon.catalog.getBusiness('saffron-spa');
      expect(biz.id).toBe(SEED.saffronSpa);
      expect(biz.is_verified).toBe(true);
      expect(biz.hours.length).toBeGreaterThan(0);
      expect(biz.photos.length).toBeGreaterThan(0);
      expect(biz.plans.length).toBeGreaterThan(0);
      const [point] = await anon.catalog.businessLocationPoints(biz.id);
      expect(point?.lat).toBeGreaterThan(33);

      const services = await anon.catalog.listBusinessServices(biz.id);
      expect(services.every((s) => s.type === 'service')).toBe(true);
      expect(services.some((s) => s.options.length > 0)).toBe(true);
      expect(services[0]?.category?.name).toBeTruthy();

      const plan = await anon.catalog.getMembershipPlan(biz.plans[0]!.id);
      expect(plan.business?.slug).toBe('saffron-spa');

      const stats = await anon.catalog.reviewStats(biz.id);
      expect(stats.total).toBe(Object.values(stats.counts).reduce((a, b) => a + b, 0));
      const fives = await anon.catalog.listReviews({ businessId: biz.id }, { rating: 5 });
      expect(fives.every((r) => r.rating === 5)).toBe(true);
      expect(fives.length).toBe(stats.counts[5]);
    });

    it('gets a listing by slug and by id', async () => {
      const bySlug = await anon.catalog.getListing(SEED.sunriseHikeSlug);
      expect(bySlug.id).toBe(SEED.sunriseHike);
      expect(bySlug.business.id).toBe(SEED.margallaBusiness);
      const byId = await anon.catalog.getListing(SEED.sunriseHike);
      expect(byId.slug).toBe(SEED.sunriseHikeSlug);
      await expectApiError(anon.catalog.getListing('no-such-listing'), 'not_found', 'Listing not found');
    });

    it('searches with filters', async () => {
      const kayaking = await anon.catalog.searchListings(searchFiltersSchema.parse({ query: 'kayaking' }));
      expect(kayaking.total).toBeGreaterThanOrEqual(2);
      expect(kayaking.items.every((i) => /kayak/i.test(i.title))).toBe(true);

      const lahore = await anon.catalog.searchListings(searchFiltersSchema.parse({ city: 'Lahore', sort: 'price_low' }));
      expect(lahore.items.every((i) => i.city === 'Lahore')).toBe(true);
      const prices = lahore.items.map((i) => i.price_amount);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));

      const services = await anon.catalog.searchListings(searchFiltersSchema.parse({ type: 'service', priceMax: 1_000_000 }));
      expect(services.items.every((i) => i.type === 'service' && i.price_amount <= 1_000_000)).toBe(true);
    });

    it('searches several categories and hosted listings', async () => {
      const categories = await anon.catalog.listCategories();
      const ids = categories.filter((c) => ['hair', 'nails'].includes(c.slug)).map((c) => c.id);
      const beauty = await anon.catalog.searchListings(searchFiltersSchema.parse({ categoryIds: ids }));
      expect(beauty.total).toBeGreaterThan(0);
      expect(beauty.items.every((l) => l.type === 'service')).toBe(true);

      const hosted = await anon.catalog.searchListings(searchFiltersSchema.parse({ hostedOnly: true, limit: 50 }));
      expect(hosted.total).toBeGreaterThan(0);
      expect(hosted.items.every((l) => l.staff.some((s) => s.staff?.is_host))).toBe(true);
    });

    it('refuses filters that are not built yet', async () => {
      const filters = searchFiltersSchema.parse({ sort: 'distance', near: { lat: 33.7, lng: 73.0 } });
      await expectApiError(anon.catalog.searchListings(filters), 'unsupported');
    });

    it('lists hosts, businesses, reviews and reference data', async () => {
      expect((await anon.catalog.topHosts({ limit: 3 })).length).toBeGreaterThan(0);
      const business = await anon.catalog.getBusiness(SEED.margallaBusiness);
      expect(business.locations.length).toBeGreaterThan(0);
      expect(Array.isArray(await anon.catalog.listReviews({ businessId: SEED.margallaBusiness }))).toBe(true);
      expect((await anon.catalog.listCategories('experience')).length).toBeGreaterThan(0);
      expect((await anon.catalog.getLegalDocument('terms')).body).toBeTruthy();
      expect((await anon.quiz.getQuestions())[0]?.answers.length).toBeGreaterThan(0);
    });


    it('loads Explore, experience details and host profiles', async () => {
      const islamabad = { minLat: 33.55, minLng: 72.9, maxLat: 33.85, maxLng: 73.25 };
      const pins = await anon.catalog.exploreListings({ box: islamabad, user: { lat: 33.72, lng: 73.06 } });
      expect(pins.length).toBeGreaterThanOrEqual(3);
      expect(pins.every((p) => p.city === 'Islamabad' && p.distance_km !== null && p.lat > 33.5)).toBe(true);

      const karachi = await anon.catalog.exploreBusinesses({ box: { minLat: 24.7, minLng: 66.9, maxLat: 25.0, maxLng: 67.2 } });
      expect(karachi.length).toBeGreaterThanOrEqual(4);
      expect(karachi.every((b) => b.city === 'Karachi' && b.from_price > 0)).toBe(true);

      const hike = await anon.catalog.getListing('margalla-sunrise-hike');
      expect(hike.highlights.length).toBeGreaterThan(0);
      expect(hike.itinerary.map((s) => s.position)).toEqual([...hike.itinerary.map((s) => s.position)].sort((a, b) => a - b));
      const host = hike.staff.map((s) => s.staff).find((s) => s?.is_host);
      expect(host).toBeTruthy();

      const profile = await anon.catalog.getHost(host!.id);
      expect(profile.display_name).toBe(host!.display_name);
      expect(profile.listings.some((l) => l.listing?.id === hike.id)).toBe(true);
    });

    it('fills the Home rails', async () => {
      const curated = await anon.catalog.curated({ tag: 'local-fun', city: 'Lahore' });
      expect(curated.length).toBeGreaterThanOrEqual(3);
      expect(curated.every((l) => l.city === 'Lahore')).toBe(true);

      const ids = curated.slice(0, 2).map((l) => l.id).reverse();
      const byIds = await anon.catalog.listingsByIds([...ids, '00000000-0000-4000-e000-00000000ffff']);
      expect(byIds.map((l) => l.id)).toEqual(ids);

      const services = await anon.catalog.servicesNearYou({ city: 'Lahore', limit: 5 });
      expect(services.length).toBeGreaterThanOrEqual(4);
      expect(services.every((b) => b.city === 'Lahore' && b.from_price > 0 && b.distance_km === null)).toBe(true);
      const near = await anon.catalog.servicesNearYou({ near: { lat: 31.5204, lng: 74.3587 }, limit: 3 });
      expect(near.map((b) => b.city)).toEqual(['Lahore', 'Lahore', 'Lahore']);
      expect(near.every((b, i) => i === 0 || (b.distance_km ?? 0) >= (near[i - 1]?.distance_km ?? 0))).toBe(true);

      const distances = await anon.catalog.listingDistances({ lat: 31.5204, lng: 74.3587 }, ids);
      expect(distances.size).toBe(2);
      expect([...distances.values()].every((km) => km >= 0 && km < 50)).toBe(true);

      const photo = curated[0]?.media[0]?.url;
      expect(photo).toMatch(/^storage:\/\/seed-media\//);
      expect(anon.media.url(photo)).toBe(`${url}/storage/v1/object/public/${photo?.slice('storage://'.length)}`);
      expect(anon.media.url('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    });

    it('requires sign in for personal data', async () => {
      await expectApiError(anon.bookings.listMine(), 'unauthenticated');
    });
  });

  describe('sign up and profile', () => {
    it('completes sign up', async () => {
      expect(await anon.auth.needsSignUp()).toBe(false);
      expect(await me.auth.needsSignUp()).toBe(true);

      const form = completeSignUpWithPasswordSchema.parse({
        firstName: 'Integration',
        lastName: 'Tester',
        email: myEmail,
        dateOfBirth: '1996-03-23',
        password: 'moment2027',
        marketingOptOut: true,
        acceptTerms: true,
      });
      await me.auth.completeSignUp(form);

      const { profile, private: details } = await me.profile.getMe();
      expect(profile.display_name).toBe('Integration Tester');
      expect(details?.date_of_birth).toBe('1996-03-23');
      expect(details?.first_name).toBe('Integration');
      expect(details?.last_name).toBe('Tester');
      expect(await me.auth.needsSignUp()).toBe(false);
      expect((details?.notification_prefs as { marketing: boolean }).marketing).toBe(false);

      const accepted = await me.db.from('legal_acceptances').select('document_id');
      expect(accepted.data?.length).toBeGreaterThanOrEqual(2);

      // The new password works.
      await newApi().auth.signInWithPassword({ email: myEmail, password: 'moment2027' });
    });

    it('signs in with a phone OTP (test number from supabase/config.toml)', async () => {
      const phoneApi = newApi();
      const phone = '+923001234567';
      await phoneApi.auth.sendPhoneOtp(phone);
      await expectApiError(phoneApi.auth.verifyPhoneOtp({ phone, code: '000000' }), 'invalid');
      await phoneApi.auth.verifyPhoneOtp({ phone, code: '123456' });
      const user = await phoneApi.auth.getUser();
      expect(user?.phone).toBe('923001234567');
      expect(typeof (await phoneApi.auth.needsSignUp())).toBe('boolean');
    });

    it('tells which step follows the email', async () => {
      expect(await anon.auth.emailSignInMethod(SEED.consumer)).toBe('password');
      expect(await anon.auth.emailSignInMethod(SEED.consumer.toUpperCase())).toBe('password');
      expect(await anon.auth.emailSignInMethod(`nobody.${Date.now()}@moment.test`)).toBe('new');
    });

    it('maps wrong passwords to a friendly error', async () => {
      await expectApiError(
        newApi().auth.signInWithPassword({ email: myEmail, password: 'wrong-password1' }),
        'invalid',
        'Incorrect email or password.',
      );
    });
  });

  describe('offers', () => {
    it('shows signed-in users public coupons only', async () => {
      const codes = (await me.catalog.listPublicCoupons()).map((c) => c.code);
      expect(codes).toContain('WELCOME10');
      expect(codes).not.toContain('ANDROONVIP');
      expect(await anon.catalog.listPublicCoupons()).toEqual([]);
    });
  });

  describe('slot booking flow', () => {
    let slotId: string;
    let bookingId: string;
    const idempotencyKey = key8();

    beforeAll(async () => {
      for (const date of upcomingLocalDates(14)) {
        const slots = await me.bookings.listSlots({ listingId: SEED.sunriseHike, date });
        const open = slots.find((s) => s.capacity - s.seats_booked >= 2);
        if (open) {
          slotId = open.id;
          return;
        }
      }
      throw new Error('No open slot in the next 14 days; run pnpm db:reset');
    });

    it('creates a booking with a coupon, priced on the server', async () => {
      const form = createBookingSchema.parse({
        mode: 'slot',
        listingId: SEED.sunriseHike,
        slotId,
        guests: { adults: 2, infants: 1 },
        couponCode: 'welcome10',
        notes: 'First time hiking',
        idempotencyKey,
      });
      const booking = await me.bookings.create(form);
      bookingId = booking.id;
      expect(booking.guest_count).toBe(2);
      expect(booking.discount_amount).toBeGreaterThan(0);
      expect(booking.total_amount).toBe(booking.subtotal_amount - booking.discount_amount + booking.fee_amount + booking.tax_amount);
      expect(booking.notes).toContain('Infants: 1.');
    });

    it('is idempotent on retry', async () => {
      const retry = await me.bookings.create(
        createBookingSchema.parse({ mode: 'slot', listingId: SEED.sunriseHike, slotId, guests: { adults: 2 }, idempotencyKey }),
      );
      expect(retry.id).toBe(bookingId);
    });

    it('surfaces RPC errors as ApiError with their message', async () => {
      await expectApiError(
        me.bookings.create(
          createBookingSchema.parse({ mode: 'slot', listingId: SEED.sunriseHike, slotId, guests: { adults: 1 }, couponCode: 'NOPE123', idempotencyKey: key8() }),
        ),
        'invalid',
        "This code doesn't exist",
      );
      await expectApiError(
        me.bookings.create(
          createBookingSchema.parse({ mode: 'slot', listingId: SEED.sunriseHike, slotId, guests: { adults: 60 }, idempotencyKey: key8() }),
        ),
        'invalid',
        /Guest count must be between/,
      );
    });

    it('lists and shows my booking', async () => {
      const upcoming = await me.bookings.listMine({ when: 'upcoming' });
      expect(upcoming.map((b) => b.id)).toContain(bookingId);
      const detail = await me.bookings.get(bookingId);
      expect(detail.listing.id).toBe(SEED.sunriseHike);
      expect(detail.events.length).toBeGreaterThan(0);
    });

    it('hides it from other consumers (RLS)', async () => {
      const hamza = await signedIn(SEED.consumer);
      await expectApiError(hamza.bookings.get(bookingId), 'not_found');
    });

    it('lets the business see and confirm it', async () => {
      const owner = await signedIn(SEED.ownerMargalla);
      const businesses = await owner.business.listMyBusinesses();
      expect(businesses.map((b) => b.business.id)).toContain(SEED.margallaBusiness);
      const bookings = await owner.business.listBookings(SEED.margallaBusiness, { status: ['pending', 'confirmed'] });
      const mine = bookings.find((b) => b.id === bookingId);
      expect(mine?.contact_name).toBe('Integration Tester');
      if (mine?.status === 'pending') {
        expect((await owner.business.updateBookingStatus(bookingId, 'confirmed')).status).toBe('confirmed');
      }
    });

    it('cancels', async () => {
      const cancelled = await me.bookings.cancel({ bookingId, reason: 'Plans changed' });
      expect(cancelled.status).toBe('cancelled_by_consumer');
      expect((await me.bookings.listMine({ when: 'past' })).map((b) => b.id)).toContain(bookingId);
    });
  });

  describe('appointment booking flow', () => {
    it('books a free time and maps double-booking to a conflict', async () => {
      let time: { starts_at: string; staff_id: string } | undefined;
      for (const date of upcomingLocalDates(14).slice(1)) {
        time = (await me.bookings.listAvailableTimes({ listingId: SEED.swedishMassage, date }))[0];
        if (time) break;
      }
      expect(time).toBeDefined();
      const form = (k: string) =>
        createBookingSchema.parse({
          mode: 'appointment',
          listingId: SEED.swedishMassage,
          startsAt: time!.starts_at,
          staffId: time!.staff_id,
          guests: { adults: 1 },
          idempotencyKey: k,
        });
      const booking = await me.bookings.create(form(key8()));
      expect(booking.staff_id).toBe(time!.staff_id);
      await expectApiError(me.bookings.create(form(key8())), 'conflict');
      await me.bookings.cancel({ bookingId: booking.id });
    });

    it('quotes, lists calendar days and books a services cart in one go', async () => {
      const quote = await me.bookings.quote({ listingId: SEED.swedishMassage, couponCode: 'SAFFRON20' });
      expect(quote.discount).toBeGreaterThan(0);
      expect(quote.couponError).toBeNull();
      expect((await me.bookings.quote({ listingId: SEED.swedishMassage, couponCode: 'SUMMER24' })).couponError).toBe('This code has expired');

      const days = upcomingLocalDates(14);
      const open = await me.bookings.availableDates({ listingId: SEED.swedishMassage, from: days[0]!, to: days[13]! });
      expect(open.size).toBeGreaterThan(5);

      const coupons = await me.bookings.publicCoupons(SEED.saffronSpa);
      expect(coupons.map((c) => c.code)).toContain('SAFFRON20');
      expect(coupons.map((c) => c.code)).not.toContain('SUMMER24');

      const date = days.find((d, i) => i > 2 && open.has(d))!;
      const [time] = await me.bookings.listAvailableTimes({ listingId: SEED.swedishMassage, date });
      const bookings = await me.bookings.createCart(
        createCartSchema.parse({ services: [{ listingId: SEED.swedishMassage, startsAt: time!.starts_at }], idempotencyKey: key8() }),
      );
      expect(bookings).toHaveLength(1);
      await me.bookings.cancel({ bookingId: bookings[0]!.id });
    });

    it('lists upcoming sessions with seats', async () => {
      const slots = await anon.bookings.upcomingSlots({ listingId: SEED.sunriseHike });
      expect(slots.length).toBeGreaterThan(5);
      expect(slots.every((s) => new Date(s.starts_at) > new Date())).toBe(true);
    });
  });

  describe('engagement, groups, chat and account', () => {
    it('manages bucket lists', async () => {
      const nature = await me.bucketList.createList({ name: 'I love nature' });
      const food = await me.bucketList.createList({ name: 'Food trips' });

      // One listing in two lists: the heart stays filled until it leaves both.
      const item = await me.bucketList.addItem({ bucketListId: nature.id, listingId: SEED.sunriseHike, note: 'With cousins' });
      await me.bucketList.addItem({ bucketListId: food.id, listingId: SEED.sunriseHike });
      expect((await me.bucketList.savedIds()).listings.get(SEED.sunriseHike)?.sort()).toEqual([nature.id, food.id].sort());

      const lists = await me.bucketList.lists();
      const row = lists.find((l) => l.id === nature.id);
      expect(row?.itemCount).toBe(1);
      expect(row?.thumbnailUrl).toBeTruthy();

      const detail = await me.bucketList.getList(nature.id);
      expect(detail.items[0]?.listing?.title).toBeTruthy();

      await me.bucketList.renameList(nature.id, { name: 'Mountains' });
      expect((await me.bucketList.getList(nature.id)).name).toBe('Mountains');

      await me.bucketList.removeListing(food.id, SEED.sunriseHike);
      expect((await me.bucketList.savedIds()).listings.get(SEED.sunriseHike)).toEqual([nature.id]);

      await me.bucketList.moveItem(item.id, food.id);
      expect((await me.bucketList.savedIds()).listings.get(SEED.sunriseHike)).toEqual([food.id]);

      await me.bucketList.deleteList(food.id);
      await me.bucketList.deleteList(nature.id);
      expect((await me.bucketList.savedIds()).listings.has(SEED.sunriseHike)).toBe(false);
    });

    it('knows who may review a business', async () => {
      // A fresh account has no visits; the seeded dev user has one at Margalla Trails
      // (their Saffron Spa visit is left for trying "Write a review" in the app).
      expect(await me.reviews.reviewableBookings(SEED.saffronSpa)).toEqual([]);
      const dev = await signedIn(SEED.devUser);
      const [visit] = await dev.reviews.reviewableBookings(SEED.margallaBusiness);
      expect(visit?.listing_title).toBe('Private Trail Guide (3 hours)');
    });

    it('recommends a place', async () => {
      const rec = await me.recommendPlace(
        recommendPlaceSchema.parse({ kind: 'experience', name: 'Pir Sohawa sunset point', city: 'Islamabad', location: { lat: 33.76, lng: 73.12 } }),
      );
      expect(rec.status).toBe('new');
    });

    it('takes the quiz', async () => {
      const questions = await me.quiz.getQuestions();
      const answers = questions.map((q) => q.answers[0]?.id).filter((id): id is string => Boolean(id));
      const result = await me.quiz.submit(answers);
      expect(result.badge_id).toBeTruthy();
      expect((await me.quiz.latestResult())?.badge?.name).toBeTruthy();
      expect((await me.catalog.servicesNearYou({ city: 'Islamabad', limit: 5 })).length).toBeGreaterThan(0);
    });

    it('creates and renames a group', async () => {
      const group = await me.groups.create({
        name: 'Hunza in May',
        visibility: 'private',
        isOpenToMatch: false,
        maxMembers: 8,
        interestTagIds: [],
      });
      await me.groups.rename(group.id, 'Hunza in June');
      const mine = await me.groups.listMine();
      const found = mine.find((m) => m.group.id === group.id);
      expect(found?.role).toBe('owner');
      expect(found?.group.name).toBe('Hunza in June');
      await me.groups.remove(group.id);
    });

    it('likes, matches, recommends and invites in a group', async () => {
      const group = await me.groups.create({ name: 'Weekend Plans', visibility: 'private', isOpenToMatch: false, maxMembers: 8, interestTagIds: [] });
      const hike = await me.catalog.getListing('margalla-sunrise-hike');
      await me.groups.like(group.id, { listingId: hike.id });
      await me.groups.like(group.id, { listingId: hike.id }); // twice is fine
      const likes = await me.groups.likes(group.id);
      expect(likes.map((l) => l.listing?.id)).toEqual([hike.id]);

      const recs = await me.groups.recommendations(group.id, 5);
      expect(recs.length).toBe(5);
      expect(recs.some((r) => r.id === hike.id)).toBe(false);

      // Opening to match makes the group public; it then finds groups in the same city.
      await me.groups.updateSettings(group.id, { isOpenToMatch: true, sharingEnabled: true, likesVisibility: 'only_me' });
      const full = await me.groups.get(group.id);
      expect([full.visibility, full.is_open_to_match, full.sharing_enabled, full.likes_visibility]).toEqual(['public', true, true, 'only_me']);
      await me.groups.updateSettings(group.id, { visibility: 'private' });
      expect((await me.groups.get(group.id)).is_open_to_match).toBe(false);

      const people = await me.groups.findPeople('fatima');
      expect(people[0]?.display_name).toBe('Fatima Noor');
      await me.groups.invite(group.id, [people[0]!.id]);
      const members = (await me.groups.get(group.id)).members;
      expect(members.find((m) => m.user_id === people[0]!.id)?.status).toBe('invited');
      await me.groups.removeMember(group.id, people[0]!.id);
      await me.groups.remove(group.id);
    });

    it('chats with a business', async () => {
      const conversation = await me.chat.startWithBusiness(SEED.margallaBusiness);
      const sent = await me.chat.send({ conversationId: conversation.id, body: 'Is parking available?', attachments: [] });
      expect(sent.body).toBe('Is parking available?');
      const messages = await me.chat.listMessages(conversation.id);
      expect(messages[0]?.id).toBe(sent.id);
      const list = await me.chat.listConversations();
      expect(list.map((c) => c.conversation.id)).toContain(conversation.id);

      const owner = await signedIn(SEED.ownerMargalla);
      expect((await owner.business.inbox(SEED.margallaBusiness)).map((c) => c.id)).toContain(conversation.id);
    });

    it('sends feedback and reads account data', async () => {
      const ticket = await me.support.submitFeedback({ topic: 'app', message: 'Loving the sunrise hike listing!' });
      expect(ticket.subject).toBe('Feedback: The Moment app');
      expect((await me.support.listMessages(ticket.id)).length).toBe(1);
      expect(Array.isArray(await me.account.wallet.balances())).toBe(true);
      expect(await me.account.notifications.unreadCount()).toBeGreaterThanOrEqual(0);
      expect((await me.account.memberships.listPlans(SEED.margallaBusiness)).every((p) => p.business_id === SEED.margallaBusiness)).toBe(true);
    });
  });
});
